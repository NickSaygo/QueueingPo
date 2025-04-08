from datetime import datetime
from decimal import Decimal

def convert_data_for_insertion(data):
    converted_data = {}

    # Convert ref_no (int) - Include only if value is provided
    if "ref_no" in data and data["ref_no"]:
        converted_data["ref_no"] = str(data["ref_no"])[:25]

    # Convert queue (int) - Include only if value is provided
    if "queue" in data and data["queue"]:
        converted_data["queue"] = str(data["queue"])[:45]

    # Convert WLP (varchar(45)) - Ensure it's a string, truncate if necessary, include if value is provided
    if "batch_no" in data and data["batch_no"]:
        converted_data["batch_no"] = str(data["batch_no"])[:45]

    # Convert destination (varchar(45)) - Include only if value is provided
    if "destination" in data and data["destination"]:
        converted_data["destination"] = str(data["destination"])[:45]

    # Convert school_count (int) - Include only if value is provided
    if "school_count" in data and data["school_count"]:
        try:
            # Ensure school_count is an integer
            converted_data["school_count"] = int(data["school_count"])
        except ValueError:
            converted_data["school_count"] = 0  # Default to 0 if conversion fails

    # Convert lots (varchar(45)) - Include only if value is provided
    if "lots" in data and data["lots"]:
        converted_data["lots"] = str(data["lots"])[:45]

    # Convert cbm (decimal(10, 3)) - Include only if value is provided
    if "cbm" in data and data["cbm"]:
        try:
            # Ensure cbm is a valid decimal value
            converted_data["cbm"] = Decimal(str(data["cbm"])).quantize(Decimal("0.001"))
        except Exception:
            converted_data["cbm"] = Decimal("0.000")  # Default to 0 if invalid value is provided

    # Convert created_by (varchar(100)) - Include only if value is provided
    if "created_by" in data and data["created_by"]:
        converted_data["created_by"] = str(data["created_by"])[:100]

    # Convert created_at (timestamp) - Convert to datetime, or use current timestamp if not provided
    if "created_at" in data and data["created_at"]:
        try:
            converted_data["created_at"] = datetime.strptime(data["created_at"], "%Y-%m-%d %H:%M:%S")
        except ValueError:
            converted_data["created_at"] = datetime.now()  # Use current time if parsing fails
    else:
        converted_data["created_at"] = datetime.now()

    # Convert updated_at (timestamp) - Convert to datetime, or use current timestamp if not provided
    if "updated_at" in data and data["updated_at"]:
        try:
            converted_data["updated_at"] = datetime.strptime(data["updated_at"], "%Y-%m-%d %H:%M:%S")
        except ValueError:
            converted_data["updated_at"] = datetime.now()  # Use current time if parsing fails
    else:
        converted_data["updated_at"] = datetime.now()

    # Convert Schedule (date) - Convert to date, or set to None if not provided
    if "schedule" in data and data["schedule"]:
        try:
            converted_data["schedule"] = datetime.strptime(data["schedule"], "%Y-%m-%d").date()
        except ValueError:
            converted_data["schedule"] = None  # Set to None if the date is invalid
    
    # Convert start_delivery_at (date) - Convert to date, or set to None if not provided
    if "start_delivery_at" in data and data["start_delivery_at"]:
        try:
            converted_data["start_delivery_at"] = datetime.strptime(data["start_delivery_at"], "%Y-%m-%d").date()
        except ValueError:
            converted_data["start_delivery_at"] = None  # Set to None if the date is invalid
    
    # Convert ended_delivery_at (date) - Convert to date, or set to None if not provided
    if "ended_delivery_at" in data and data["ended_delivery_at"]:
        try:
            converted_data["ended_delivery_at"] = datetime.strptime(data["ended_delivery_at"], "%Y-%m-%d").date()
        except ValueError:
            converted_data["ended_delivery_at"] = None  # Set to None if the date is invalid

    # Convert Vehicle No. (varchar(45)) - Include only if value is provided
    if "vehicle_no" in data and data["vehicle_no"]:
        converted_data["vehicle_no"] = str(data["vehicle_no"])[:45]

    # Convert Status (enum) - Ensure the status is one of the valid enum values, include only if valid
    if "status" in data and data["status"] in ['Generated', 'Assigned', 'Complete']:
        converted_data["status"] = data["status"]

    return converted_data
