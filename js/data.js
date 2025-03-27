document.addEventListener("DOMContentLoaded", function () {
            fetchTruckRecords();
            displaywlp();
});

function fetchTruckRecords() {
    fetch("http://127.0.0.1:5000/trucks")
        .then(response => response.json())
        .then(data => {
            let tableRows = "";
            data.forEach(truck => {
                tableRows += `
                    <tr id = ${truck['Ref#']}>
                        <td>${truck['Ref#']}</td>
                        <td>${truck['Vehicle No.']}</td>
                        <td>${truck['Vehicle Type']}</td>
                        <td>${truck['WLP']}</td>
                        <td>${truck['CBM']}</td>
                        <td>${truck['Schedule']}</td>
                        <td>${truck['Destination']}</td>
                        <td>${truck['Status']}</td>
                        <td><button>Complete</button></td>
                    </tr>
                `;
            });
            document.getElementById("summary-tab").innerHTML = tableRows;
        })
        .catch(error => console.error("Error fetching data:", error));
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