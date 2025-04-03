function fetchHtml(file, placeholderID) {
    // Using fetch to load the HTML file and inject it into a div using innerHTML
    fetch(file)  // Replace with the path to your HTML file
        .then(response => response.text())
        .then(html => {
            // Inject the fetched HTML into the div
            document.getElementById(placeholderID).innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading HTML file:', error);
        });
}