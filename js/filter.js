document.addEventListener("DOMContentLoaded", function () {
    fetchTruckRecords();        // Load trucks initially
    attachCheckboxListeners();  // Attach event listeners to checkboxes
});

// ✅ This will fetch the data from the /trucks api endpoint
function fetchTruckRecords() {
    fetch("http://127.0.0.1:5000/trucks")
    .then(response => response.json())
    .then(data => {
        // console.log("Fetched Data:", data); // Debugging output

        // Define sorting order
        const statusOrder = {
            "INCOMING": 1,
            "DEPLOYMENT": 2,
            "ONGOING": 3,
            "IDLE": 4
        };

        // Normalize and sort data
        data.sort((a, b) => statusOrder[a.status.trim().toUpperCase()] - statusOrder[b.status.trim().toUpperCase()]);

        // Save data globally for filtering later
        window.allTrucksData = data;

        // Function to filter trucks based on checkboxes
        displayFilteredTrucks();
    })
    .catch(error => console.error("Error fetching data:", error));
}

// ✅ Function to filter trucks based on checkboxes
function displayFilteredTrucks() {
    const checkboxes = document.querySelectorAll("#vehicle-state-filter input[type='checkbox']");
    let selectedStatuses = new Set();

    // This will loop to all filter checkbox that will be used as parameter for filterization
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedStatuses.add(checkbox.name.toUpperCase()); // Normalize to uppercase
        }
    });

    // If no checkbox is selected, show all trucks
    let filteredData = window.allTrucksData;

    if (selectedStatuses.size > 0) {
        filteredData = window.allTrucksData.filter(truck => selectedStatuses.has(truck.status.trim().toUpperCase()));
    }

    // Clear Existing table rows
    let tableRows = "";

    // Loop through the filtered data to populate the delivery table summary
    filteredData.forEach(truck => {
        let status = truck.status.trim().toUpperCase();

        // Initiallize toggle button
        let buttonHTML = "";

        // Assign button based on truck status
        if (status === "INCOMING") {
            buttonHTML = `<button class="status-btn">Arrive</button>`;
        } else if (status === "DEPLOYMENT") {
            buttonHTML = `<button class="status-btn">Dispatch</button>`;
        } else if (status === "ONGOING") {
            buttonHTML = `<button class="status-btn">Done</button>`;
        }

        // Create a table row for every truck data
        tableRows += `
            <tr id="${truck['ref_no']}">
                <td>${truck['ref_no'] === null? '' : truck['ref_no']}</td>
                <td>${truck['vehicle_no'] === null? '' : truck['vehicle_no']}</td>
                <td>${truck['vehicle_type'] === null? '' : truck['vehicle_type']}</td>
                <td>${truck['batch_no'] === null? '' : truck['batch_no']}</td>
                <td>${truck['cbm'] === null? '' : truck['cbm']}</td>
                <td>${truck['task'] === null? '' : truck['task']}</td>
                <td>${truck['schedule'] === null? '' : truck['schedule']}</td>
                <td>${truck['destination'] === null? '' : truck['destination']}</td>
                <td>${truck['status'] === null? '' : truck['status']}</td>
                <td>${buttonHTML}</td> 
            </tr>
        `;
    });

    // Push the data to summary-tab to show in the main table
    document.getElementById("summary-tab").innerHTML = tableRows;
}

// ✅ Attach event listeners to checkboxes
function attachCheckboxListeners() {
    document.querySelectorAll("#vehicle-state-filter input[type='checkbox']").forEach(checkbox => {
        checkbox.addEventListener("change", displayFilteredTrucks);
    });
}
