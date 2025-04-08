from flask import Flask, jsonify, request
from data_conversion import convert_data_for_insertion
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import datetime
import socket

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing

# MySQL Database Connection
def get_db_connection():
    try:
        return mysql.connector.connect(
            host="localhost",
            user="root",  # Default user for XAMPP
            password="",  # Leave empty if no password is set
            database="queueing",
            connection_timeout=28800,
            autocommit=True
        )
    except Error as e:
        print(f"Error while connecting to MySQL: {e}")
        return None

# API Endpoint to Fetch Truck Records
@app.route("/trucks", methods=["GET"])
def get_truck_records():
    db = get_db_connection()
    if db is None:
        return jsonify({"error": "Failed to connect to the database"}), 500

    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM truckrecord")
        trucks = cursor.fetchall()
        return jsonify(trucks)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()
        
@app.route("/container", methods=["GET"])
def get_container_records():
    db = get_db_connection()
    if db is None:
        return jsonify({"error": "Failed to connect to the database"}), 500

    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM container")
        container = cursor.fetchall()
        return jsonify(container)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route('/workload-plan', methods=["GET"])
def workload_plan():
    db = get_db_connection()
    if db is None:
        return jsonify({"error": "Failed to connect to the database"}), 500

    cursor = db.cursor(dictionary=True)
    try:
        # Get idle trucks
        cursor.execute("SELECT * FROM truckrecord WHERE status = 'IDLE'")
        idle_trucks = cursor.fetchall()

        # Get workload plans without assigned vehicles
        #cursor.execute("SELECT WLP FROM WorkloadPlan WHERE `Vehicle No.` = '' OR `Vehicle No.` IS NULL")
        cursor.execute("SELECT * FROM workloadplan")
        unassigned_wlp = cursor.fetchall()

        return jsonify({"idle_trucks": idle_trucks, "unassigned_wlp": unassigned_wlp})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route("/truck-summary", methods=["GET"])
def get_truck_summary():
    db = get_db_connection()
    if db is None:
        return jsonify({"error": "Failed to connect to the database"}), 500

    cursor = db.cursor(dictionary=True)
    try:
        query = """
        SELECT 
            `vehicle_type`,
            COUNT(CASE WHEN status = 'IDLE' THEN 1 END) AS Idle,
            COUNT(CASE WHEN status = 'ONGOING' THEN 1 END) AS Ongoing,
            COUNT(CASE WHEN status = 'INCOMING' THEN 1 END) AS Incoming,
            COUNT(CASE WHEN status = 'DEPARTING' THEN 1 END) AS Departing
        FROM truckrecord
        GROUP BY `vehicle_type`;
        """
        cursor.execute(query)
        summary = cursor.fetchall()
        return jsonify(summary)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()
        
@app.route("/add-truck", methods=["POST"])
def add_truck():
    db = get_db_connection()
    if db is None:
        return jsonify({"success": False, "error": "Failed to connect to the database"}), 500

    data = request.json

    # Extract form data
    vehicle_no = data.get("vehicle_no").replace("-", " ")  # Replace '-' with space
    vehicle_type = data.get("vehicle_type")
    no_personel = data.get("no_personel")
    ownership = data.get("ownership")
    cbm = data.get("cbm")

    try:
        cursor = db.cursor(dictionary=True)

        # ❗ **Check if the vehicle number already exists**
        cursor.execute("SELECT `vehicle_no` FROM truckrecord WHERE `vehicle_no` = %s", (vehicle_no,))
        existing_truck = cursor.fetchone()

        if existing_truck:
            return jsonify({"success": False, "error": "Vehicle No. already exists in the database."})

        # ✅ Insert new truck if not exists
        sql = """
        INSERT INTO truckrecord (`vehicle_no`, `vehicle_type`, `no_of_personel`, `vehicle_ownership`, `cbm`)
        VALUES (%s, %s, %s, %s, %s)
        """
        values = (vehicle_no, vehicle_type, no_personel, ownership, cbm)

        cursor.execute(sql, values)
        db.commit()
        
        current_year = str(datetime.datetime.now().year)[-2:]
        dataContent = {
            "ref_no": f'T{current_year}{vehicle_no}',
            "vehicle_no": vehicle_no,
            "vehicle_type": vehicle_type,
            "ownership": ownership
        }
        
        audit_action(db, "CREATE", "create_truck", dataContent)

        return jsonify({"success": True, "message": "Truck added successfully!"})

    except mysql.connector.Error as err:
        return jsonify({"success": False, "error": str(err)})

    finally:
        cursor.close()
        db.close()

@app.route("/add-wlp", methods=["POST"])
def add_wlp():
    db = get_db_connection()
    if db is None:
        return jsonify({"success": False, "error": "Failed to connect to the database"}), 500

    data = request.json
    
    converted_data = convert_data_for_insertion(data)

    # Extract form data
    queue = converted_data.get("queue")
    batch = converted_data.get("batch_no")
    destination = converted_data.get("destination")
    schedule = converted_data.get("schedule")
    cbm = converted_data.get("cbm")
    school_count = converted_data.get("school_count")
    
    try:
        cursor = db.cursor(dictionary=True)
        
        # Generate the ref_no based on the current year
        current_year = str(datetime.datetime.now().year)[-2:]  # Get the last 2 digits of the year (e.g., 2025 -> "25")
        letter = "W"  # Assuming the letter part is always "C"

        # Query to get the highest ref_no for the current year (e.g., C250003)
        cursor.execute("""
            SELECT `ref_no` 
            FROM workloadplan 
            WHERE `ref_no` LIKE %s 
            ORDER BY `ref_no` DESC LIMIT 1
        """, (f"{letter}{current_year}%",))

        last_ref_no = cursor.fetchone()

        if last_ref_no:
            # Get the last counter from the ref_no (e.g., C250003 -> 3)
            last_counter = int(last_ref_no["ref_no"][len(letter+current_year):])
            new_counter = last_counter + 1
        else:
            # No containers for this year yet, so start from 1
            new_counter = 1
        
        # Format the new ref_no (e.g., C250004)
        new_ref_no = f"{letter}{current_year}{new_counter:04d}"

        # ❗ **Check if the WLP already exists**
        cursor.execute("SELECT `batch_no` FROM workloadplan WHERE `batch_no` = %s", (batch,))
        existing_wlp = cursor.fetchone()

        if existing_wlp:
            return jsonify({"success": False, "error": "WLP already exists in the database."})

        # ✅ Insert new WLP if not exists
        sql = """
        INSERT INTO workloadplan (`ref_no`, `queue`, `batch_no`, `destination`, `school_count`, `cbm`, `schedule`)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        values = (new_ref_no, queue, batch, destination, school_count, cbm, schedule)

        cursor.execute(sql, values)
        db.commit()
        
        dataContent = {
            "ref_no": new_ref_no,
            "batch_no": batch
        }
        
        audit_action(db, "CREATE", "created_wlp", dataContent)

        return jsonify({"success": True, "message": "WLP added successfully!"})

    except mysql.connector.Error as err:
        return jsonify({"success": False, "error": str(err)})

    finally:
        cursor.close()
        db.close()

@app.route("/assign-wlp", methods=["PUT"])
def assign_wlp():
    db = get_db_connection()
    if db is None:
        return jsonify({"success": False, "error": "Failed to connect to the database"}), 500

    data = request.json  # This is an array of objects
    
    try:
        cursor = db.cursor(dictionary=True)
        
        # Start a transaction so that either all updates are successful or none
        db.start_transaction()

        # Loop through the data to update each WLP
        for item in data:
            batch_no = item.get("batch_no")
            vehicle_no = item.get("vehicle_no")
            
            # Check if the workload plan with the given batch_no exists
            cursor.execute("SELECT `ref_no`, `batch_no` FROM workloadplan WHERE `batch_no` = %s", (batch_no,))
            existing_wlp = cursor.fetchone()
            
            if not existing_wlp:
                # If the WLP does not exist, return an error for that item
                db.rollback()  # Rollback any changes made so far
                return jsonify({"success": False, "error": f"WLP with batch_no {batch_no} does not exist in the database."})
            
            if existing_wlp:
                ref_no = existing_wlp['ref_no']
    
                # Update the workloadplan with the new vehicle_no and status
                sql = """
                    UPDATE workloadplan
                    SET `vehicle_no` = %s,
                        `status` = 'Assigned'
                    WHERE `batch_no` = %s
                """
                values = (vehicle_no, batch_no)

                cursor.execute(sql, values)
            
                cursor.execute("SELECT `ref_no`, `destination`, `schedule` FROM workloadplan WHERE `batch_no` = %s", (batch_no,))
                wlp_info = cursor.fetchone()
    
                cursor.execute("SELECT `vehicle_no` FROM truckrecord WHERE `vehicle_no` = %s", (vehicle_no,))
                existing_truck = cursor.fetchone()
            
                if not existing_truck:
                    # If the WLP does not exist, return an error for that item
                    db.rollback()  # Rollback any changes made so far
                    return jsonify({"success": False, "error": f"the vehicle {vehicle_no} does not exist in the database."})

                # Update the workloadplan with the new vehicle_no and status
                sql = """
                UPDATE truckrecord
                SET `ref_no` = %s,
                    `batch_no` = %s,
                    `status` = 'Departing',
                    `task` = 'Delivery',
                    `schedule` = %s,
                    `destination` = %s
                WHERE `vehicle_no` = %s
                """
                values = (ref_no, batch_no, wlp_info['schedule'], wlp_info['destination'], vehicle_no)

                cursor.execute(sql, values)

        # Commit the transaction if all updates were successful
        db.commit()
        
        dataContent = {
            "ref_no": ref_no,
            "batch_no": batch_no,
            "vehicle_no": vehicle_no
        }
        audit_action(db, "UPDATE", "assign_wlp", dataContent)

        return jsonify({"success": True, "message": "WLPs assigned successfully!"})
        
    except mysql.connector.Error as err:
        db.rollback()  # Rollback if any error occurs
        return jsonify({"success": False, "error": str(err)})

    finally:
        cursor.close()
        db.close()

@app.route("/update-truck-status", methods=["POST"])
def update_truck_status():
    db = get_db_connection()
    
    try:
        cursor = db.cursor(dictionary=True)
        data = request.get_json()
        ref_no = data.get("ref_no")
        new_status = data.get("status")

        # Check if ref_no and new_status are provided
        if not ref_no or not new_status:
            return jsonify({"success": False, "message": "Missing reference number or status"}), 400
        
        # If the status is 'ONGOING', update the workload plan with start_delivery_at
        if new_status == 'ONGOING':
            sql = "UPDATE workloadplan SET start_delivery_at = NOW() WHERE `ref_no` = %s"
            values = (ref_no,)  # Tuple for a single value
            cursor.execute(sql, values)
            
            sql = "UPDATE truckrecord SET status = %s WHERE `ref_no` = %s"
            values = [new_status, ref_no]
            cursor.execute(sql, tuple(values))

        # Update the truck status in the database
        if new_status == 'IDLE':
            sql = """UPDATE truckrecord 
                SET status = %s, 
                ref_no = NULL, 
                batch_no = NULL, 
                task = NULL, 
                schedule = NULL, 
                destination = NULL 
                WHERE `ref_no` = %s
            """
            values = [new_status, ref_no]
            cursor.execute(sql, tuple(values))
            
        if new_status == 'INCOMING':
            sql = "UPDATE workloadplan SET ended_delivery_at = NOW(), status = 'Complete' WHERE `ref_no` = %s"
            values = (ref_no,)  # Tuple for a single value
            cursor.execute(sql, values)
            
            sql = "UPDATE truckrecord SET status = %s WHERE `ref_no` = %s"
            values = [new_status, ref_no]
            cursor.execute(sql, tuple(values))

        # Commit all changes in a single transaction
        db.commit()
        
        # Log audit action
        dataContent = {
            "ref_no": ref_no,
            "status": values
        }
        audit_action(db, "UPDATE", "truck_status", dataContent)
        
        return jsonify({"success": True, "message": f"Truck with reference no. {ref_no} updated to {new_status}, WLP cleared"})

    except Exception as e:
        # Rollback in case of an error to keep the database consistent
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        db.close()

        
@app.route("/update-container-status", methods=["POST"])
def update_container_status():
    db = get_db_connection()
    
    try:
        cursor = db.cursor(dictionary=True)
        data = request.get_json()
        ref_no = data.get("ref_no")
        new_status = data.get("status")

        # Check if ref_no and new_status are provided
        if not ref_no or not new_status:
            return jsonify({"success": False, "message": "Missing reference number or status"}), 400

        sql = "UPDATE container SET status = %s WHERE ref_no = %s"
        values = [new_status, ref_no]

        # Execute the update query
        cursor.execute(sql, tuple(values))
        db.commit()
        
        dataContent = {
            "ref_no": ref_no,
            "status": new_status
        }
        audit_action(db, "UPDATE", "container_status", dataContent)
        
        return jsonify({"success": True, "message": f"Truck {ref_no} updated to {new_status}, WLP cleared"})


    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        db.close()
        
@app.route("/add-container", methods=["POST"])
def add_container():
    db = get_db_connection()
    if db is None:
        return jsonify({"success": False, "error": "Failed to connect to the database"}), 500

    data = request.json
    
    # Extract form data
    billLading = data.get("bill-lading")
    vehicleNo = data.get("vehicle-no")
    status = data.get("vehicle-status")
    origin = data.get("origin")
    destination = data.get("destination")
    departure = data.get("departure")
    estArrival = data.get("est-arrival")
    description = data.get("description")

    try:
        cursor = db.cursor(dictionary=True)

        # ❗ **Check if the Container already exists**
        cursor.execute("SELECT `bill_lading` FROM container WHERE `bill_lading` = %s", (billLading,))
        existing_Container = cursor.fetchone()

        if existing_Container:
            return jsonify({"success": False, "error": "Container already exists in the database."})

        # Generate the ref_no based on the current year
        current_year = str(datetime.datetime.now().year)[-2:]  # Get the last 2 digits of the year (e.g., 2025 -> "25")
        letter = "C"  # Assuming the letter part is always "C"

        # Query to get the highest ref_no for the current year (e.g., C250003)
        cursor.execute("""
            SELECT `ref_no` 
            FROM container 
            WHERE `ref_no` LIKE %s 
            ORDER BY `ref_no` DESC LIMIT 1
        """, (f"{letter}{current_year}%",))

        last_ref_no = cursor.fetchone()

        if last_ref_no:
            # Get the last counter from the ref_no (e.g., C250003 -> 3)
            last_counter = int(last_ref_no["ref_no"][len(letter+current_year):])
            new_counter = last_counter + 1
        else:
            # No containers for this year yet, so start from 1
            new_counter = 1
        
        # Format the new ref_no (e.g., C250004)
        new_ref_no = f"{letter}{current_year}{new_counter:04d}"

        # ✅ Insert new Container with the generated ref_no
        sql = """
        INSERT INTO container (`ref_no`, `bill_lading`, `vehicle_no`, `origin`, `destination`, `departure`, `est_arrival`, `remarks`, `status`)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        values = (new_ref_no, billLading, vehicleNo, origin, destination, departure, estArrival, description, status)

        cursor.execute(sql, values)
        db.commit()
        
        dataContent = {
            "ref_no": new_ref_no,
            "status": status,
            "bill_lading": billLading,
        }
        
        audit_action(db, "CREATE", "created_container", dataContent)

        return jsonify({"success": True, "message": "Container added successfully!", "ref_no": new_ref_no})

    except mysql.connector.Error as err:
        return jsonify({"success": False, "error": str(err)})

    finally:
        cursor.close()
        db.close()


def audit_action(db, crud, action, data):
    
    try:
        cursor = db.cursor(dictionary=True)
        
        # For now lets get the computer name as author of the audit
        computer_name = socket.gethostname()
        
        # Initiallize here the data that will be inserted to the database
        ref = data['ref_no']
        message = ""
        
        # Here is where we format the message to specific actions
        
        # Created Container
        if action == "created_container":
            message = f"{computer_name}[{crud}: created an {data['status']} container with Bill of Lading No: {data['bill_lading']}]"

        if action == "container_status":
            message = f"{computer_name}[{crud}: Update Container status to {data['status']}]"

        if action == "created_wlp":
            message = f"{computer_name}[{crud}: created a WLP with batch no: {data['batch_no']}]"

        if action == "assign_wlp":
            message = f"{computer_name}[{crud}: WLP {data['batch_no']} was assigned to truck number {data['vehicle_no']}]"

        if action == "create_truck":
            message = f"{computer_name}[{crud}: Added a truck with plate number {data['vehicle_no']}, type {data['vehicle_type']} from {data['ownership']}]"

        if action == "truck_status":
            message = f"{computer_name}[{crud}: Update truck status to {data['status']}]"
            
        # Initiallize here the sql
        sql = """
        INSERT INTO audit_trail (`ref_no`, `message`) VALUES (%s, %s)
        """
        
        values = (ref, message)
        
        cursor.execute(sql, values)
        db.commit()
        
        
    except mysql.connector.Error as err:
        return jsonify({"success": False, "error": str(err)})
    
# Run Flask Server
if __name__ == "__main__":
    app.run(debug=True, port=5000)
