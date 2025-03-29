document.addEventListener("DOMContentLoaded", function () {
    fetchTruckRecords(); // Load trucks initially
    attachCheckboxListeners(); // Attach event listeners to checkboxes
});

function fetchTruckRecords() {
    fetch("http://127.0.0.1:5000/trucks")
    .then(response => response.json())
    .then(data => {
        console.log("Fetched Data:", data); // Debugging output

        // Define sorting order
        const statusOrder = {
            "INCOMING": 1,
            "DEPLOYMENT": 2,
            "ONGOING": 3,
            "IDLE": 4
        };

        // Normalize and sort data
        data.sort((a, b) => statusOrder[a.Status.trim().toUpperCase()] - statusOrder[b.Status.trim().toUpperCase()]);

        // Save data globally for filtering later
        window.allTrucksData = data;

        displayFilteredTrucks();
    })
    .catch(error => console.error("Error fetching data:", error));
}

// ✅ Function to filter trucks based on checkboxes
function displayFilteredTrucks() {
    const checkboxes = document.querySelectorAll(".f-row input[type='checkbox']"); // ! For Review f-row is used multiple times all throughout the system. This might effect other parts
    let selectedStatuses = new Set();

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedStatuses.add(checkbox.name.toUpperCase()); // Normalize to uppercase
        }
    });

    // If no checkbox is selected, show all trucks
    let filteredData = window.allTrucksData;

    if (selectedStatuses.size > 0) {
        filteredData = window.allTrucksData.filter(truck => selectedStatuses.has(truck.Status.trim().toUpperCase()));
    }

    let tableRows = "";
    filteredData.forEach(truck => {
        let status = truck.Status.trim().toUpperCase();
        let buttonHTML = "";

        // Assign button based on truck status
        if (status === "INCOMING") {
            buttonHTML = `<button class="status-btn">Arrive</button>`;
        } else if (status === "DEPLOYMENT") {
            buttonHTML = `<button class="status-btn">Dispatch</button>`;
        } else if (status === "ONGOING") {
            buttonHTML = `<button class="status-btn">Done</button>`;
        }

        tableRows += `
            <tr id="${truck['Ref#']}">
                <td>${truck['Ref#'] === null? '' : truck['Ref#']}</td>
                <td>${truck['Vehicle No.'] === null? '' : truck['Vehicle No.']}</td>
                <td>${truck['Vehicle Type'] === null? '' : truck['Vehicle Type']}</td>
                <td>${truck['WLP'] === null? '' : truck['WLP']}</td>
                <td>${truck['CBM'] === null? '' : truck['CBM']}</td>
                <td>${truck['Schedule'] === null? '' : truck['Schedule']}</td>
                <td>${truck['Destination'] === null? '' : truck['Destination']}</td>
                <td>${truck['Status'] === null? '' : truck['Status']}</td>
                <td>${buttonHTML}</td> 
            </tr>
        `;
    });

    document.getElementById("summary-tab").innerHTML = tableRows;
}

// ✅ Attach event listeners to checkboxes
function attachCheckboxListeners() {
    document.querySelectorAll(".f-row input[type='checkbox']").forEach(checkbox => {
        checkbox.addEventListener("change", displayFilteredTrucks);
    });
}
