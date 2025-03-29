document.addEventListener("DOMContentLoaded", function () {
            // fetchTruckRecords();
            displaywlp();
            fetchTruckSummary()

            
});



function displaywlp() {
    fetch("http://127.0.0.1:5000/workload-plan")
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById("wlp-ass");
            tbody.innerHTML = ""; // Clear existing rows

            let assigned = 0;
            let remaining = 0;
            let complete = 0;
            let queue = 0;

            data.unassigned_wlp.forEach(wlp => {
                if(wlp.Status === 'Generated'){
                    const tr = document.createElement("tr");

                    const toQueue = document.createElement("td");
                    queue += 1;
                    toQueue.textContent = queue;
                    tr.appendChild(toQueue);

                    // Workload Plan Column
                    const tdWlp = document.createElement("td");
                    tdWlp.textContent = wlp.WLP;
                    tr.appendChild(tdWlp);

                    const tdcbm = document.createElement("td");
                    tdcbm.textContent = wlp.CBM;
                    tr.appendChild(tdcbm);

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
                    remaining += 1;
                    document.getElementById('wlp-remaining').textContent = remaining;
                }

                else if(wlp.Status === 'Assigned'){
                    assigned += 1;
                    document.getElementById('wlp-assigned').textContent = assigned;
                }

                else if(wlp.Status === 'Complete'){
                    complete += 1;
                    document.getElementById('wlp-complete').textContent = complete;
                }
                else{
                    console.log('Batch No: ${wlp.WLP} has no status to identify its allocation');
                }


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