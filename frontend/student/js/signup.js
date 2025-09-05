document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    const passwordInput = document.getElementById('password');
    const passwordRequirements = document.getElementById('passwordRequirements');
    const errorAlert = document.getElementById('errorAlert');
    const errorText = document.getElementById('errorText');
    const successAlert = document.getElementById('successAlert');
    const successText = document.getElementById('successText');
    
    // Show password requirements when password field is focused
    passwordInput.addEventListener('focus', function() {
    passwordRequirements.style.display = 'block';
    });
    
    // Hide password requirements when password field loses focus (if empty)
    passwordInput.addEventListener('blur', function() {
    if (passwordInput.value === '') {
        passwordRequirements.style.display = 'none';
    }
    });
    
    // Validate password in real-time
    passwordInput.addEventListener('input', function() {
    validatePassword();
    });
    
    // Form submission handler
    signupForm.addEventListener('submit', async function(e) {
        
        e.preventDefault();
        hideErrors();

        const isUsernameValid = validateUsername();
        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();
        
        if (isUsernameValid && isEmailValid && isPasswordValid) {
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            submitBtn.disabled = true;

            try {
            const data = await apiRequest(
                "/auth/signup", 
                "POST",
                {
                username: signupForm.username.value,
                email: signupForm.email.value,
                password: signupForm.password.value
                }
            );

            showSuccess("Account created successfully! Redirecting to dashboard...");
            localStorage.setItem("userToken", data.token);

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 2000);
            } catch (error) {
            console.error(error);

            if (error.status === 409) {
                showError("An account with this email or username already exists. Please try logging in or use different credentials.");
            } else if (error.status === 400) {
                showError("Please fill in all required fields correctly.");
            } else if (error.status === 500) {
                showError("Server error. Please try again later.");
            } else {
                showError(error.message || "An unexpected error occurred. Please try again.");
            }

            submitBtn.innerHTML = "Create Account";
            submitBtn.disabled = false;
            }
        }

    });

    // Validation functions
    function validateUsername() {
        const username = document.getElementById('username').value;
        const usernameError = document.getElementById('usernameError');
        
        if (username.length < 3) {
            showError(usernameError, 'Username must be at least 3 characters long');
            return false;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            showError(usernameError, 'Username can only contain letters, numbers, and underscores');
            return false;
        }
        
        hideError(usernameError);
        return true;
    }
    
    function validateEmail() {
        const email = document.getElementById('email').value;
        const emailError = document.getElementById('emailError');
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError(emailError, 'Please enter a valid email address');
            return false;
        }
        
        hideError(emailError);
        return true;
    }
    
    function validatePassword() {
        const password = passwordInput.value;
        const passwordError = document.getElementById('passwordError');
        
        // Check password requirements
        const hasMinLength = password.length >= 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        // Update requirement indicators
        updateRequirement('lengthReq', hasMinLength);
        updateRequirement('uppercaseReq', hasUpperCase);
        updateRequirement('lowercaseReq', hasLowerCase);
        updateRequirement('numberReq', hasNumber);
        updateRequirement('specialReq', hasSpecialChar);
        
        if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
            showError(passwordError, 'Password does not meet all requirements');
            return false;
        }
        
        hideError(passwordError);
        return true;
    }
    
    function updateRequirement(elementId, isMet) {
        const element = document.getElementById(elementId);
        if (isMet) {
            element.classList.add('requirement-met');
            element.classList.remove('requirement-not-met');
            element.innerHTML = '<i class="fas fa-check-circle"></i> ' + element.textContent;
        } else {
            element.classList.add('requirement-not-met');
            element.classList.remove('requirement-met');
            element.innerHTML = '<i class="fas fa-circle"></i> ' + element.textContent;
        }
    }
    
    function showError(element, message) {
        if (typeof element === 'string') {
            // Show global error alert
            errorText.textContent = message;
            errorAlert.style.display = 'block';
            // Scroll to error
            errorAlert.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            // Show field-specific error
            element.querySelector('span').textContent = message;
            element.style.display = 'block';
        }
    }
    
    function hideError(element) {
        element.style.display = 'none';
    }
    
    function hideErrors() {
        const errors = document.querySelectorAll('.error-message');
        errors.forEach(error => error.style.display = 'none');
        errorAlert.style.display = 'none';
    }
    
    function showSuccess(message) {
        successText.textContent = message;
        successAlert.style.display = 'block';
        // Scroll to success message
        successAlert.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});