from flask import Flask, jsonify
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing

# MySQL Database Connection
db = mysql.connector.connect(
    host="localhost",
    user="root",  # Default user for XAMPP
    password="",  # Leave empty if no password is set
    database="queueing",
    connection_timeout=28800,
    autocommit=True
)
cursor = db.cursor(dictionary=True)  # Fetch results as dictionaries

# API Endpoint to Fetch Truck Records
@app.route("/trucks", methods=["GET"])
def get_truck_records():
    cursor.execute("SELECT * FROM truckrecord")
    trucks = cursor.fetchall()
    return jsonify(trucks)

@app.route('/workload-plan', methods=["GET"])
def workload_plan():
    # Get idle trucks
    cursor.execute("SELECT `Vehicle No.` FROM TruckRecord WHERE Status = 'IDLE'")
    idle_trucks = cursor.fetchall()  # ✅ Fetch result before executing next query

    # Get workload plans without assigned vehicles
    cursor.execute("SELECT WLP FROM WorkloadPlan WHERE `Vehicle No.` = ''")
    unassigned_wlp = cursor.fetchall()  # ✅ Fetch result before returning response

    return jsonify({"idle_trucks": idle_trucks, "unassigned_wlp": unassigned_wlp})  # ✅ Return JSON

@app.route("/truck-summary", methods=["GET"])
def get_truck_summary():
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

# Run Flask Server
if __name__ == "__main__":
    app.run(debug=True, port=5000)  # Runs on port 5000