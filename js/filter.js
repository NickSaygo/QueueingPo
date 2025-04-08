document.addEventListener("DOMContentLoaded", function () {
    const truckRadio = document.getElementById("truck");
    const containerRadio = document.getElementById("container");
    const vehicleStateDiv = document.getElementById("stats-state");

    fetchTruckRecords();        // Load trucks initially
    attachCheckboxListeners();
    fetchTruckSummary(); 
    displayContainerCount();

    // Function to toggle visibility based on selection
    function updateFilterVisibility() {
        if (truckRadio.checked) {
            
            // Show all checkboxes when Truck is selected
            vehicleStateDiv.innerHTML = `
                <p class="card-label" id="state-filer">Vehicle State</p>
                            <div class="f-row" id="vehicle-state-filter">
                                <input type="checkbox" name="idle" id="filter-idle">       
                                <label for="idle">Idle</label>

                                <input type="checkbox" name="incoming" id="filter-incoming">   
                                <label for="incoming">Incoming</label>
                                
                                <input type="checkbox" name="Departing" id="filter-departing"> 
                                <label for="deployment">Departing</label>

                                <input type="checkbox" name="ongoing" id="filter-ongoing">    
                                <label for="ongoing">Ongoing</label>
                            </div>
            `;
            fetchTruckRecords();        // Load trucks initially
            attachCheckboxListeners();
        } else if (containerRadio.checked) {
            // Show only Incoming and Ongoing when Container is selected
            
            vehicleStateDiv.innerHTML = `
                <p class="card-label" id="state-filer">Container State</p>
                            <div class="f-row" id="container-state-filter">
                                <input type="checkbox" name="incoming" id="filter-incoming">   
                                <label for="incoming">Incoming</label>
                                
                                <input type="checkbox" name="ongoing" id="filter-ongoing">   
                                <label for="ongoing">Ongoing</label>

                                <input type="checkbox" name="completed" id="filter-completed">   
                                <label for="completed">Completed</label>
                            </div>
            `;
            fetchContainerRecords(); 
            attachCheckboxListeners1(); 
        }
    }

    // Attach event listeners to both radio buttons
    truckRadio.addEventListener("change", updateFilterVisibility);
    containerRadio.addEventListener("change", updateFilterVisibility);

    // Initialize the filter display on page load
    updateFilterVisibility();

    document.getElementById("summary-tab").addEventListener("click", function (event) {
        if (event.target.classList.contains("status-btn")) {
            let row = event.target.closest("tr"); // Get the row where the button was clicked
            let refNo = row.id; // Get truck's reference number
            let currentStatus = event.target.innerText; // Get button text (DEPLOY, ARRIVE, DONE)
            
            let newStatus = "";
            if (currentStatus === "ARRIVE") newStatus = "IDLE";
            if (currentStatus === "DEPLOY") newStatus = "ONGOING";
            if (currentStatus === "DONE") newStatus = "INCOMING";


            fetchContainerRecords(); 
            attachCheckboxListeners1();
            fetchTruckSummary();
            
            // Send the update request to Flask
            updateTruckStatus(refNo, newStatus);
        }
    });

    document.getElementById("summary-tab1").addEventListener("click", function (event) {
        if (event.target.classList.contains("status-btn")) {

            let row = event.target.closest("tr"); // Get the row where the button was clicked
            let refNo = row.id; // Get truck's reference number
            let currentStatus = event.target.innerText; // Get button text (DEPLOY, ARRIVE, DONE)
            
            let newStatus = "";
            if (currentStatus === "ARRIVE") newStatus = "ONGOING";
            if (currentStatus === "DONE") newStatus = "COMPLETED";

            // Send the update request to Flask
            fetchContainerRecords(); 
            attachCheckboxListeners1();

            updateContainerStatus(refNo, newStatus);
            displayContainerCount();
        }
    });

    fetchTruckSummary();
    displayContainerCount();

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
            "DEPARTING": 2,
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

        const date = new Date(truck['schedule']);
        // Use toLocaleDateString to format the date
        const formattedDate = date.toLocaleDateString('en-GB', {
            weekday: 'short',  // 'Fri'
            day: '2-digit',    // '04'
            month: 'short',    // 'Apr'
            year: 'numeric'    // '2025'
        });

        // Initiallize toggle button
        let buttonHTML = "";

        // Assign button based on truck status
        if (status === "INCOMING") {
            buttonHTML = `<button class="status-btn">ARRIVE</button>`;
        } else if (status === "DEPARTING") {
            buttonHTML = `<button class="status-btn">DEPLOY</button>`;
        } else if (status === "ONGOING") {
            buttonHTML = `<button class="status-btn">DONE</button>`;
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
                <td>${truck['schedule'] === null? '' : formattedDate}</td>
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

function fetchContainerRecords() {
    fetch("http://127.0.0.1:5000/container")
    .then(response => response.json())
    .then(data => {
        // console.log("Fetched Data:", data); // Debugging output

        // Define sorting order
        const statusOrder = {
            "INCOMING": 1,
            "ONGOING": 2,
            "COMPLETED": 3,
        };

        // Normalize and sort data
        data.sort((a, b) => statusOrder[a.status.trim().toUpperCase()] - statusOrder[b.status.trim().toUpperCase()]);

        // Save data globally for filtering later
        window.allContainerData = data;

        // Function to filter trucks based on checkboxes
        displayFilteredContainer();
    })
    .catch(error => console.error("Error fetching data:", error));
}

// ✅ Function to filter trucks based on checkboxes
function displayFilteredContainer() {
    const checkboxes = document.querySelectorAll("#container-state-filter input[type='checkbox']");
    let selectedStatuses = new Set();

    // This will loop to all filter checkbox that will be used as parameter for filterization
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedStatuses.add(checkbox.name.toUpperCase()); // Normalize to uppercase
        }
    });

    // If no checkbox is selected, show all trucks
    let filteredData = window.allContainerData;

    if (selectedStatuses.size > 0) {
        filteredData = window.allContainerData.filter(container => selectedStatuses.has(container.status.trim().toUpperCase()));
    }

    // Clear Existing table rows
    let tableRows = "";

    // Loop through the filtered data to populate the delivery table summary
    filteredData.forEach(container => {
        let status = container.status.trim().toUpperCase();

        const date = new Date(container['departure']);
        // Use toLocaleDateString to format the date
        const formattedDate = date.toLocaleDateString('en-GB', {
            weekday: 'short',  // 'Fri'
            day: '2-digit',    // '04'
            month: 'short',    // 'Apr'
            year: 'numeric'    // '2025'
        });
        const date1 = new Date(container['est_arrival']);
        // Use toLocaleDateString to format the date
        const formattedDate1 = date1.toLocaleDateString('en-GB', {
            weekday: 'short',  // 'Fri'
            day: '2-digit',    // '04'
            month: 'short',    // 'Apr'
            year: 'numeric'    // '2025'
        });

        // Initiallize toggle button
        let buttonHTML = "";

        // Assign button based on truck status
        if (status === "INCOMING") {
            buttonHTML = `<button class="status-btn">ARRIVE</button>`;
        } else if (status === "ONGOING") {
            buttonHTML = `<button class="status-btn">DONE</button>`;
        }

        // Create a table row for every truck data
        tableRows += `
            <tr id="${container['ref_no']}">
                <td>${container['ref_no'] === null? '' : container['ref_no']}</td>
                <td>${container['vehicle_no'] === null? '' : container['vehicle_no']}</td>
                <td>${container['destination'] === null? '' : container['destination']}</td>
                <td>${container['departure'] === null? '' : formattedDate}</td>
                <td>${container['est_arrival'] === null? '' : formattedDate1}</td>
                <td>${container['status'] === null? '' : container['status']}</td>
                <td>${buttonHTML}</td> 
            </tr>
        `;
    });

    // Push the data to summary-tab to show in the main table
    document.getElementById("summary-tab1").innerHTML = tableRows;

}

// ✅ Attach event listeners to checkboxes
function attachCheckboxListeners1() {
    document.querySelectorAll("#container-state-filter input[type='checkbox']").forEach(checkbox => {
        checkbox.addEventListener("change", displayFilteredContainer);
    });
}

function updateTruckStatus(refNo, newStatus) {


    fetch("http://127.0.0.1:5000/update-truck-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref_no: refNo, status: newStatus }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            fetchTruckRecords(); // Refresh table after updating
        } else {
            console.error("Update failed:", data.message);
        }
    })
    .catch(error => console.error("Error:", error));
    fetchTruckSummary();
    displaywlp()
}

function updateContainerStatus(refNo, newStatus) {
    fetch("http://127.0.0.1:5000/update-container-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref_no: refNo, status: newStatus }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            fetchTruckRecords(); // Refresh table after updating
        } else {
            console.error("Update failed:", data.message);
        }
    })
    .catch(error => console.error("Error:", error));
    fetchContainerRecords(); 
    attachCheckboxListeners1();
    displayContainerCount();
     
    
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
