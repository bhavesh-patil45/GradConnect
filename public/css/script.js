function togglePasswordVisibility() {
    const passwordInput = document.getElementById("password");
    const eyeIcon = document.querySelector(".toggle-password");
  
    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      eyeIcon.textContent = "🙈"; // Change icon when password is visible
    } else {
      passwordInput.type = "password";
      eyeIcon.textContent = "👁️"; // Change back to the original eye icon
    }
  }
  