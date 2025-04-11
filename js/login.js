document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("inputs").addEventListener("submit", async function (e) {
      e.preventDefault();
  
      const email = document.getElementById("username-login").value;
      const password = document.getElementById("password-login").value;
  
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
  
      const result = await response.json();
  
      if (result.success) {
        alert("Login successful!");
        window.location.href = "index.html"; 
      } else {
        alert("Invalid credentials");
      }
    });
  });
  