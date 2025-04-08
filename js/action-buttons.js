document.addEventListener("click", function (event) {
    // Ensure the modal exists before interacting with elements
    const modal = document.querySelector(".form-wrapper");
    if (!modal) return;

    // Save Button Clicked
    if (event.target && event.target.id === "save-add-truck") {
        console.log("Save button clicked!");

        const vehicleNoInput = document.getElementById("vehicle-no");
        const vehicleTypeDropdown = document.getElementById("input-vehicle-type");
        const cbmField = document.getElementById("cbm");

        console.log(vehicleTypeDropdown);

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

        fetchPOST("/add-truck", "POST", truckData, "Truck")
        
    }

    if (event.target && event.target.id === "save-add-wlp") {
        console.log("Save button clicked!");

        const dataInput = document.querySelectorAll('#add-wlp-form input');

        let formData = {}

        dataInput.forEach(input => {
            formData[input.name] = input.value;
        })

        console.log(formData);

        fetchPOST("/add-wlp", "POST", formData, "WLP");
    }

    if (event.target && event.target.id === "save-add-container") {
        console.log("Save button clicked!");

        const dataInput = document.querySelectorAll('.input-data-container input, .input-data-container textarea, .input-data-container select');

        // console.log(dataInput);

        let formData = {}

        dataInput.forEach(input => {
            formData[input.name] = input.value;
        })

        console.log(formData);

        fetchPOST("/add-container", "POST", formData, "Container");
    }
    displayContainerCount();
});

// This function is to read every changes in the website.
document.addEventListener("change", function (event) {
    
    // Once the vehicle type change. (Select element)
    if (event.target && event.target.id === "input-vehicle-type") {
        updateCBM(event.target.value);
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
        cbmField.value = cbmValues[vehicleTypeDropdown] || "";
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
function fetchPOST(url, method, ObjectData, subject) {
    // Send Data to Flask
    fetch(`http://127.0.0.1:5000${url}`, {
        method: method,
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


function saveAssignedWlp() {
    const wlpRowList = document.querySelectorAll('#wlp-ass tr');

    const filteredWlp = Array.from(wlpRowList)
        .filter(wlp => wlp.cells[3].querySelector('select').value !== "")
        .map(wlp => ({
            batch_no: wlp.cells[1].textContent,
            vehicle_no: wlp.cells[3].querySelector('select').value
        }));

    if (filteredWlp.length != 0) {
        console.log(filteredWlp);

        fetch("page/modal/save-wlp.html")  // Replace with the path to your HTML file
            .then(response => response.text())
            .then(html => {
                // Inject the fetched HTML into the div
                document.getElementById('modal-placeholder').innerHTML = html;
            })
            .then(() => {
                const assignWlpTable = document.getElementById("assigned-wlp-table");

                filteredWlp.forEach(wlp => {
                    const tableRow = document.createElement("tr");

                    const tdBatchNo = document.createElement("td");
                    tdBatchNo.textContent = wlp.batch_no;  // Set batch_no in the first <td>
                    tableRow.appendChild(tdBatchNo);

                    const tdVehicleNo = document.createElement("td");
                    tdVehicleNo.textContent = wlp.vehicle_no;  // Set vehicle_no in the second <td>
                    tableRow.appendChild(tdVehicleNo);

                    // Append the newly created <tr> to the table
                    assignWlpTable.appendChild(tableRow);
                })

                // Add event listener for the SAVE button inside the modal
                const saveButton = document.getElementById('save-assigned-wlp');
                saveButton.onclick = function () {
                    // Call fetchPOST when the user clicks "SAVE" button in the modal
                    fetchPOST("/assign-wlp", "PUT", filteredWlp, "Assigned WLP");
                    fetchTruckSummary();
                };
            })
            .catch(error => {
                console.error('Error loading HTML file:', error);
            });
    }
    else {
        const container = document.getElementById("modal-placeholder");

        container.innerHTML = `
        <div class="form-wrapper">
            <div class="form-container">
                <h1>Error</h1>
                <p>Assigned WLP is empty</p>
            
                <div class="input-data-btn f-row">
                    <button class="cancel-btn" onclick="removeModal('modal-placeholder')">CANCEL</button>
                </div>
            </div>
        </div>
        `
    }   
}

function fetchTruckSummary() {

    // Fetch from the /truck-summary api
    fetch("http://127.0.0.1:5000/truck-summary")
        .then(response => response.json())
        .then(data => {

            // Initiallize variable to use to show the table rows
            let tableRows = "";

            // This loop will populate truck count record.
            data.forEach(truck => {
                tableRows += `
                    <tr>
                        <td>${truck["vehicle_type"]}</td>
                        <td>${truck["Idle"]}</td>
                        <td>${truck["Ongoing"]}</td>
                        <td>${truck["Incoming"]}</td>
                        <td>${truck["Departing"]}</td>
                    </tr>
                `;
            });

            // To show the push the initiallized data to the summary-table
            document.getElementById("summary-table").innerHTML = tableRows;
        })
        .catch(error => console.error("Error fetching truck summary:", error));
}
// ! TEst

function displayContainerCount() {

    fetch("http://127.0.0.1:5000/container")
        .then(response => response.json())
        .then(data => {

            const containerIncoming = data.filter(d => d['status'].toUpperCase() === "INCOMING").length;
            const containerOngoing = data.filter(d => d['status'].toUpperCase() === "ONGOING").length;
            const containerCompleted = data.filter(d => d['status'].toUpperCase() === "COMPLETED").length;

            const cardIncoming = document.getElementById('container-incoming');
            const cardOngoing = document.getElementById('container-ongoing');
            const cardCompleted = document.getElementById('container-completed');

            cardIncoming.textContent = containerIncoming;
            cardOngoing.textContent = containerOngoing;
            cardCompleted.textContent = containerCompleted;

        })
        .catch(error => console.error("Error fetching data:", error));
}