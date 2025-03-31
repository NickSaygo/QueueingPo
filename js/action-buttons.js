document.addEventListener("click", function (event) {
    // Ensure the modal exists before interacting with elements
    const modal = document.querySelector(".form-wrapper");
    if (!modal) return;

    // Save Button Clicked
    if (event.target && event.target.id === "save-add-truck") {
        console.log("Save button clicked!");

        const vehicleNoInput = document.getElementById("vehicle-no");
        const vehicleTypeDropdown = document.getElementById("vehicle-type");
        const cbmField = document.getElementById("cbm");

        // Validate Vehicle No.
        if (!validateVehicleNo(vehicleNoInput)) return;

        // Validate Vehicle Type
        if (vehicleTypeDropdown.value === "Type") {
            showPopup("Please select a valid Vehicle Type.");
            return;
        }

        // Format Vehicle No. (Replace "-" with space)
        vehicleNoInput.value = vehicleNoInput.value.replace(/-/g, " ");

        const truckData = {
            vehicle_no: vehicleNoInput.value.trim(),
            vehicle_type: vehicleTypeDropdown.value.trim(),
            no_personel: document.getElementById("no-personel").value.trim(),
            ownership: document.getElementById("vehicle-ownership").value.trim(),
            cbm: cbmField.value.trim()
        };

        fetchPOST("/add-truck", truckData, "Truck")
        
    }

    if (event.target && event.target.id === "save-add-wlp") {
        console.log("Save button clicked!");

        const dataInput = document.querySelectorAll('#add-wlp-form input');

        let formData = {}

        dataInput.forEach(input => {
            formData[input.name] = input.value;
        })

        console.log(formData);

        fetchPOST("/add-wlp", formData, "WLP");
    }
});

// This function is to read every changes in the website.
document.addEventListener("change", function (event) {
    
    // Once the vehicle type change. (Select element)
    if (event.target && event.target.id === "vehicle-type") {
        updateCBM(event.target);
    }
});



// Function to Update CBM
function updateCBM(vehicleTypeDropdown) {
    // Predefined CBM Values
    const cbmValues = {
        "10W": 54,
        "18FT": 20,
        "16FT": 18,
        "4W": 8
    };

    const cbmField = document.getElementById("cbm");
    if (cbmField) {
        cbmField.value = cbmValues[vehicleTypeDropdown.value] || "";
    }
}

// Starting here are the form validators in inserting data to the database.

// Adding of Vechicle form

// Function to Validate Vehicle No.
function validateVehicleNo(input) {
    const value = input.value;

    // Allow only letters, numbers, spaces, and hyphens (-)
    if (!/^[a-zA-Z0-9\s-]+$/.test(value)) {
        showPopup("Invalid Vehicle No.! Only letters, numbers, '-' and spaces are allowed.");
        input.value = "";
        return false;
    }

    // Limit length to 10 characters
    if (value.length > 10) {
        showPopup("Vehicle No. should be 10 characters or less.");
        input.value = value.substring(0, 10);
        return false;
    }

    return true;
}



// Starting from here are the Utilities.

// Function to Show Popup
function showPopup(message) {
    const popup = document.getElementById("popup-notification");
    const popupMessage = document.getElementById("popup-message");

    popupMessage.innerText = message;
    popup.style.display = "block";
}

// Function to Close Popup
function closePopup() {
    document.getElementById("popup-notification").style.display = "none";
}


// This fetchPOST is to add data into the database getting the URL or created api from the app.py and ObjectData that contains form data.
function fetchPOST(url, ObjectData, subject) {
    // Send Data to Flask
    fetch(`http://127.0.0.1:5000${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ObjectData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showPopup(`${subject} added successfully!`);
            setTimeout(() => location.reload(), 1500); // Delay reload for better UX
        } else {
            showPopup(data.error || `An error occurred while adding the ${subject}.`);
        }
    })
    .catch(error => console.error(`Error adding ${subject}:`, error));
}
