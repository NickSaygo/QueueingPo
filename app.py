from flask import Flask, jsonify, request
from data_conversion import convert_data_for_insertion
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error

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
            COUNT(CASE WHEN status = 'DEPLOYMENT' THEN 1 END) AS Departing
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

        # ❗ **Check if the WLP already exists**
        cursor.execute("SELECT `batch_no` FROM workloadplan WHERE `batch_no` = %s", (batch,))
        existing_wlp = cursor.fetchone()

        if existing_wlp:
            return jsonify({"success": False, "error": "WLP already exists in the database."})

        # ✅ Insert new WLP if not exists
        sql = """
        INSERT INTO workloadplan (`queue`, `batch_no`, `destination`, `school_count`, `cbm`, `schedule`)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        values = (queue, batch, destination, school_count, cbm, schedule)

        cursor.execute(sql, values)
        db.commit()

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
            cursor.execute("SELECT `batch_no` FROM workloadplan WHERE `batch_no` = %s", (batch_no,))
            existing_wlp = cursor.fetchone()
            
            if not existing_wlp:
                # If the WLP does not exist, return an error for that item
                db.rollback()  # Rollback any changes made so far
                return jsonify({"success": False, "error": f"WLP with batch_no {batch_no} does not exist in the database."})

            # Update the workloadplan with the new vehicle_no and status
            sql = """
            UPDATE workloadplan
            SET `vehicle_no` = %s,
                `status` = 'Assigned'
            WHERE `batch_no` = %s
            """
            values = (vehicle_no, batch_no)

            cursor.execute(sql, values)
            
            cursor.execute("SELECT `destination` FROM workloadplan WHERE `batch_no` = %s", (batch_no,))
            assigned_destination_result = cursor.fetchone()
            assigned_destination = assigned_destination_result['destination'] if assigned_destination_result else None

            cursor.execute("SELECT `schedule` FROM workloadplan where `batch_no` = %s", (batch_no,))
            assinged_sched_result = cursor.fetchone()
            assinged_sched = assinged_sched_result['schedule'] if assinged_sched_result else None
            
    
            cursor.execute("SELECT `vehicle_no` FROM truckrecord WHERE `vehicle_no` = %s", (vehicle_no,))
            existing_truck = cursor.fetchone()
            
            if not existing_truck:
                # If the WLP does not exist, return an error for that item
                db.rollback()  # Rollback any changes made so far
                return jsonify({"success": False, "error": f"the vehicle {vehicle_no} does not exist in the database."})

            # Update the workloadplan with the new vehicle_no and status
            sql = """
            UPDATE truckrecord
            SET `batch_no` = %s,
                `status` = 'Departing',
                `task` = 'Delivery',
                `schedule` = %s,
                `destination` = %s
            WHERE `vehicle_no` = %s
            """
            values = (batch_no, assinged_sched, assigned_destination, vehicle_no)

            cursor.execute(sql, values)
            

        # Commit the transaction if all updates were successful
        db.commit()

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

        # Update the truck status in the database
        sql = "UPDATE truckrecord SET status = %s"
        values = [new_status]
        print(values)
        if new_status == 'IDLE':
            sql += ", batch_no = '', task = '', schedule = '', destination = ''"
            print(values)
            
        sql += " WHERE ref_no = %s"
        values.append(ref_no)

        # Execute the update query
        cursor.execute(sql, tuple(values))
        db.commit()
        
        return jsonify({"success": True, "message": f"Truck {ref_no} updated to {new_status}, WLP cleared"})


    except Exception as e:
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

        sql = "UPDATE container SET status = %s"
        values = [new_status]

        # Update the truck status in the database
        if new_status == 'COMPLETED':
            sql = "DELETE FROM container"
            
            
        sql += " WHERE ref_no = %s"
        if new_status == 'COMPLETED':
            values = [ref_no]
        else:
            values.append(ref_no)
        

        # Execute the update query
        cursor.execute(sql, tuple(values))
        db.commit()
        
        return jsonify({"success": True, "message": f"Truck {ref_no} updated to {new_status}, WLP cleared"})


    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        db.close()



# Run Flask Server
if __name__ == "__main__":
    app.run(debug=True, port=5000)
