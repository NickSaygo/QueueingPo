document.addEventListener("DOMContentLoaded", function () {
    displaywlp();           // This will populate the wlp-list. 
    fetchTruckSummary();     // This will populate the truck count report.
    displayContainerCount();
});

// ✅ This will populate the wlp-list. 
function displaywlp() {

    // Fetch from the /workload-plan api
    fetch("http://127.0.0.1:5000/workload-plan")
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById("wlp-ass");
            tbody.innerHTML = ""; // Clear existing rows

            // Initiallize the variables that will be used to populate the workload plan count report.
            const assigned = data.unassigned_wlp.filter(wlp => wlp['status'].toUpperCase() === "ASSIGNED ").length;
            const remaining = data.unassigned_wlp.filter(wlp => wlp['status'].toUpperCase() === "GENERATED").length;
            const complete = data.unassigned_wlp.filter(wlp => wlp['status'].toUpperCase() === "COMPLETE").length;

            document.getElementById('wlp-remaining').textContent = remaining;
            document.getElementById('wlp-assigned').textContent = assigned;
            document.getElementById('wlp-complete').textContent = complete;

            // Loop from every data that has been fetched from the database.
            data.unassigned_wlp.forEach(wlp => {

                // This will create a table row in the wlp-ass since this wlp are not yet assigned nor complete
                if(wlp.status === 'Generated'){
                    const tr = document.createElement("tr");

                    // Queue column
                    const toQueue = document.createElement("td");
                    toQueue.textContent = wlp.queue;
                    tr.appendChild(toQueue);

                    // Workload Plan Column
                    const tdWlp = document.createElement("td");
                    tdWlp.textContent = wlp.batch_no;
                    tr.appendChild(tdWlp);

                    // CBM Column
                    const tdcbm = document.createElement("td");
                    tdcbm.textContent = wlp.cbm;
                    tr.appendChild(tdcbm);

                    // Truck Selection Column
                    const tdSelect = document.createElement("td");
                    const select = document.createElement("select");
                    select.classList.add("truck-dropdown");

                    // Default Option
                    const defaultOption = document.createElement("option");
                    defaultOption.textContent = "Select Truck";
                    defaultOption.value = "";
                    select.appendChild(defaultOption);

                    // Add idle trucks to dropdown with the condition that only trucks that has higher cbm than wlp
                    data.idle_trucks.forEach(truck => {
                        if (truck['cbm'] > wlp.cbm) {
                            const option = document.createElement("option");
                            option.textContent = `${truck["vehicle_no"]} (${truck['cbm']}cbm)`;
                            option.value = truck["vehicle_no"];
                            select.appendChild(option);
                        }
                    });

                    tdSelect.appendChild(select);
                    tr.appendChild(tdSelect);
                    tbody.appendChild(tr);

                }
                else{
                    // Just incase the Batch has no status to know whether to put in the list or not
                    console.log(`Batch No: ${wlp.batch_no} has no status to identify its allocation`);
                }


            });

            // Attach event listener to all dropdowns
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
                option.hidden = true; // Hide already selected truck
            } else {
                option.hidden = false; // Show if not selected
            }
        });
    });
}

// ✅ This will populate the truck count report.
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
