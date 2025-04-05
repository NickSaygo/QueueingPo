function fetchHtml(file, placeholderID) {
    // Using fetch to load the HTML file and inject it into a div using innerHTML
    fetch(file)  // Replace with the path to your HTML file
        .then(response => response.text())
        .then(html => {
            // Inject the fetched HTML into the div
            document.getElementById(placeholderID).innerHTML = html;
        })
}

function fetchHtml1(file, placeholderID) {
    // Using fetch to load the HTML file and inject it into a div using innerHTML
    fetch(file)  // Replace with the path to your HTML file
        .then(response => response.text())
        .then(html => {
            // Inject the fetched HTML into the div
            document.getElementById(placeholderID).innerHTML = html;
        })
        .then(() => {
            // Get the departure and estimated arrival date inputs
            const departureInput = document.getElementById('departure');
            const estArrivalInput = document.getElementById('est-arrival');

            // Function to update the 'min' date for the 'est-arrival' field based on the 'departure' date
            departureInput.addEventListener('input', function() {
                const departureDate = departureInput.value;

                // If the departure date is selected, set the minimum allowed date for the 'est-arrival' field
                if (departureDate) {
                    estArrivalInput.min = departureDate;
                }
            });
        })
        .catch(error => {
            console.error('Error loading HTML file:', error);
        });
}