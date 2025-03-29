from flask import Flask, jsonify, request
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

@app.route('/workload-plan', methods=["GET"])
def workload_plan():
    db = get_db_connection()
    if db is None:
        return jsonify({"error": "Failed to connect to the database"}), 500

    cursor = db.cursor(dictionary=True)
    try:
        # Get idle trucks
        cursor.execute("SELECT `Vehicle No.` FROM TruckRecord WHERE Status = 'IDLE'")
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
            `Vehicle Type`,
            COUNT(CASE WHEN Status = 'IDLE' THEN 1 END) AS Idle,
            COUNT(CASE WHEN Status = 'ONGOING' THEN 1 END) AS Ongoing,
            COUNT(CASE WHEN Status = 'INCOMING' THEN 1 END) AS Incoming,
            COUNT(CASE WHEN Status = 'DEPLOYMENT' THEN 1 END) AS Departing
        FROM truckrecord
        GROUP BY `Vehicle Type`;
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
        cursor.execute("SELECT `Vehicle No.` FROM truckrecord WHERE `Vehicle No.` = %s", (vehicle_no,))
        existing_truck = cursor.fetchone()

        if existing_truck:
            return jsonify({"success": False, "error": "Vehicle No. already exists in the database."})

        # ✅ Insert new truck if not exists
        sql = """
        INSERT INTO truckrecord (`Vehicle No.`, `Vehicle Type`, `no_of_personel`, `vehicle_ownership`, `status`, `CBM`)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        values = (vehicle_no, vehicle_type, no_personel, ownership, "Idle", cbm)

        cursor.execute(sql, values)
        db.commit()

        return jsonify({"success": True, "message": "Truck added successfully!"})

    except mysql.connector.Error as err:
        return jsonify({"success": False, "error": str(err)})

    finally:
        cursor.close()
        db.close()


# Run Flask Server
if __name__ == "__main__":
    app.run(debug=True, port=5000)
