document.addEventListener("DOMContentLoaded", function () {
            // fetchTruckRecords();
            displaywlp();
            fetchTruckSummary()

            
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

        let tableRows = "";
        data.forEach(truck => {
            let status = truck.Status.trim().toUpperCase(); // Normalize status
            let buttonHTML = ""; // Default: No button

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
                    <td>${truck['Ref#']}</td>
                    <td>${truck['Vehicle No.']}</td>
                    <td>${truck['Vehicle Type']}</td>
                    <td>${truck['WLP']}</td>
                    <td>${truck['CBM']}</td>
                    <td>${truck['Schedule']}</td>
                    <td>${truck['Destination']}</td>
                    <td>${truck['Status']}</td>
                    <td>${buttonHTML}</td> 
                </tr>
            `;
        });

        document.getElementById("summary-tab").innerHTML = tableRows;
    })
    .catch(error => console.error("Error fetching data:", error));

// Function to handle button clicks (You can define what happens here)
    function handleAction(ref, action) {
    console.log(`Truck ${ref} action: ${action}`);
    // You can add logic here to send a request to the server to update the status
    }
}

function displaywlp() {
    fetch("http://127.0.0.1:5000/workload-plan")
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById("wlp-ass");
            tbody.innerHTML = ""; // Clear existing rows

            data.unassigned_wlp.forEach(wlp => {
                const tr = document.createElement("tr");

                // Workload Plan Column
                const tdWlp = document.createElement("td");
                tdWlp.textContent = wlp.WLP;
                tr.appendChild(tdWlp);

                // Truck Selection Column
                const tdSelect = document.createElement("td");
                const select = document.createElement("select");
                select.classList.add("truck-dropdown"); // ✅ Add class for tracking

                // Default Option
                const defaultOption = document.createElement("option");
                defaultOption.textContent = "Select Truck";
                defaultOption.value = "";
                select.appendChild(defaultOption);

                // Add idle trucks to dropdown
                data.idle_trucks.forEach(truck => {
                    const option = document.createElement("option");
                    option.textContent = truck["Vehicle No."];
                    option.value = truck["Vehicle No."];
                    select.appendChild(option);
                });

                tdSelect.appendChild(select);
                tr.appendChild(tdSelect);
                tbody.appendChild(tr);
            });

            // ✅ Attach event listener to all dropdowns
            document.querySelectorAll(".truck-dropdown").forEach(dropdown => {
                dropdown.addEventListener("change", updateDropdowns);
            });
        })
        .catch(error => console.error("Error fetching data:", error));
}

// ✅ Function to update dropdowns dynamically
function updateDropdowns() {
    const selectedValues = new Set();

    // Collect all selected values
    document.querySelectorAll(".truck-dropdown").forEach(dropdown => {
        if (dropdown.value) {
            selectedValues.add(dropdown.value);
        }
    });

    // Update dropdowns
    document.querySelectorAll(".truck-dropdown").forEach(dropdown => {
        Array.from(dropdown.options).forEach(option => {
            if (option.value && selectedValues.has(option.value) && option.value !== dropdown.value) {
                option.hidden = true; // ✅ Hide already selected truck
            } else {
                option.hidden = false; // ✅ Show if not selected
            }
        });
    });
}

function fetchTruckSummary() {
    fetch("http://127.0.0.1:5000/truck-summary")
        .then(response => response.json())
        .then(data => {
            let tableRows = "";
            data.forEach(truck => {
                tableRows += `
                    <tr>
                        <td>${truck["Vehicle Type"]}</td>
                        <td>${truck["Idle"]}</td>
                        <td>${truck["Ongoing"]}</td>
                        <td>${truck["Incoming"]}</td>
                        <td>${truck["Departing"]}</td>
                    </tr>
                `;
            });
            document.getElementById("summary-table").innerHTML = tableRows;
        })
        .catch(error => console.error("Error fetching truck summary:", error));
}