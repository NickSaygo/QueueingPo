document.addEventListener('DOMContentLoaded', function() {
    const truckTable = document.getElementById("truck-table");
    const containerTable = document.getElementById("container-table");

    const radioButtons = document.querySelectorAll('#vehicle-type input[type="radio"]');

    // Set the 'truck' radio button as checked by default
    document.getElementById('truck').checked = true;

    radioButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Check if the radio button is selected
            if (this.checked) {
                console.log("Selected radio button value:", this.id);

                // Toggle visibility based on the selected radio button
                if (this.id === 'truck') {
                    truckTable.style.display = 'table';  // Show the truck table
                    containerTable.style.display = 'none';  // Hide the container table
                } else if (this.id === 'container') {
                    containerTable.style.display = 'table';  // Show the container table
                    truckTable.style.display = 'none';  // Hide the truck table
                }
            }
        });
    });

    // Initially set the truck table visible and container table hidden (even though it's already the default due to radio button selection)
    truckTable.style.display = 'table';
    containerTable.style.display = 'none';
});
