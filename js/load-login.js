window.onload = function () {
    // Load the modal HTML from another file
    fetch('page/modal/login.html')
      .then(response => response.text())
      .then(data => {
        const container = document.getElementById('modal-placeholder-login');
        container.innerHTML = data;
        container.style.display = 'block'; // show it after loading
      })
      .catch(err => console.error('Failed to load modal:', err));
};

  // Function to close the modal
  function closeModal() {
    document.getElementById("modal-placeholder-login").style.display = "none";
}