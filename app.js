// Global state
const App = {
    user: null,
    token: localStorage.getItem('token'),
    socket: null,
    currentProject: null
};

// API helper
const API = {
    baseURL: '/api',
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(App.token && { 'Authorization': `Bearer ${App.token}` })
            },
            ...options
        };
        
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // Auth methods
    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: { email, password }
        });
        App.user = data.data.user;
        App.token = data.data.token;
        localStorage.setItem('token', App.token);
        return data;
    },
    
    async register(name, email, password) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: { name, email, password }
        });
        App.user = data.data.user;
        App.token = data.data.token;
        localStorage.setItem('token', App.token);
        return data;
    },
    
    async getCurrentUser() {
        if (!App.token) return null;
        try {
            const data = await this.request('/auth/me');
            App.user = data.data.user;
            return data.data.user;
        } catch (error) {
            localStorage.removeItem('token');
            App.token = null;
            return null;
        }
    },
    
    // Project methods
    async getProjects() {
        return await this.request('/projects');
    },
    
    async createProject(projectData) {
        return await this.request('/projects', {
            method: 'POST',
            body: projectData
        });
    },
    
    async getProject(id) {
        return await this.request(`/projects/${id}`);
    },
    
    async updateProject(id, data) {
        return await this.request(`/projects/${id}`, {
            method: 'PUT',
            body: data
        });
    },
    
    async deleteProject(id) {
        return await this.request(`/projects/${id}`, {
            method: 'DELETE'
        });
    },
    
    // AI generation
    async generateFeatures(projectId, prompt) {
        return await this.request(`/projects/${projectId}/ai-generate`, {
            method: 'POST',
            body: { prompt }
        });
    },
    
    // Chat methods
    async getMessages(projectId) {
        return await this.request(`/chat/projects/${projectId}/messages`);
    },
    
    async sendMessage(projectId, content, attachments = []) {
        return await this.request(`/chat/projects/${projectId}/messages`, {
            method: 'POST',
            body: { content, attachments }
        });
    },
    
    // Payment methods
    async createPaymentIntent(amount, projectId) {
        return await this.request('/payments/create-payment-intent', {
            method: 'POST',
            body: { amount, projectId }
        });
    },
    
    async confirmPayment(paymentIntentId, projectId) {
        return await this.request('/payments/confirm-payment', {
            method: 'POST',
            body: { paymentIntentId, projectId }
        });
    }
};

// UI Components
const UI = {
    // Show/hide modals
    showModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    },
    
    hideModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    },
    
    // Show notifications
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff'};
            color: white;
            border-radius: 4px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    },
    
    // Update header based on auth state
    updateHeader() {
        const headerActions = document.querySelector('.header-actions');
        if (!headerActions) return;
        
        if (App.user) {
            headerActions.innerHTML = `
                <div class="user-menu">
                    <span>Welcome, ${App.user.name}</span>
                    <div class="dropdown">
                        <button class="dropdown-toggle">▼</button>
                        <div class="dropdown-menu">
                            <a href="#" onclick="UI.showModal('dashboard-modal')">Dashboard</a>
                            <a href="#" onclick="Auth.logout()">Logout</a>
                        </div>
                    </div>
                </div>
            `;
        } else {
            headerActions.innerHTML = `
                <a class="link" href="#" onclick="UI.showModal('login-modal')">Sign in</a>
                <a class="btn btn-outline" href="#" onclick="UI.showModal('register-modal')">Become a Creator</a>
                <a class="btn btn-primary" href="#" onclick="UI.showModal('builder-modal')">Start Building</a>
            `;
        }
    },
    
    // Load projects into dashboard
    async loadProjects() {
        try {
            const response = await API.getProjects();
            const projects = response.data.projects;
            
            const projectsContainer = document.getElementById('projects-container');
            if (!projectsContainer) return;
            
            if (projects.length === 0) {
                projectsContainer.innerHTML = `
                    <div class="empty-state">
                        <h3>No projects yet</h3>
                        <p>Create your first project to get started</p>
                        <button class="btn btn-primary" onclick="UI.showModal('builder-modal')">Create Project</button>
                    </div>
                `;
                return;
            }
            
            projectsContainer.innerHTML = projects.map(project => `
                <div class="project-card" data-project-id="${project._id}">
                    <h3>${project.title}</h3>
                    <p>${project.description}</p>
                    <div class="project-meta">
                        <span class="status status-${project.status}">${project.status}</span>
                        <span class="category">${project.category}</span>
                    </div>
                    <div class="project-actions">
                        <button class="btn btn-sm" onclick="ProjectManager.openProject('${project._id}')">View</button>
                        <button class="btn btn-sm btn-outline" onclick="ProjectManager.editProject('${project._id}')">Edit</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading projects:', error);
            UI.showNotification('Failed to load projects', 'error');
        }
    }
};

// Authentication
const Auth = {
    async login(email, password) {
        try {
            await API.login(email, password);
            UI.updateHeader();
            UI.hideModal('login-modal');
            UI.showNotification('Login successful!', 'success');
            
            // Load dashboard if it exists
            if (document.getElementById('dashboard-modal')) {
                UI.loadProjects();
            }
        } catch (error) {
            UI.showNotification(error.message, 'error');
        }
    },
    
    async register(name, email, password) {
        try {
            await API.register(name, email, password);
            UI.updateHeader();
            UI.hideModal('register-modal');
            UI.showNotification('Registration successful!', 'success');
            
            // Load dashboard if it exists
            if (document.getElementById('dashboard-modal')) {
                UI.loadProjects();
            }
        } catch (error) {
            UI.showNotification(error.message, 'error');
        }
    },
    
    logout() {
        App.user = null;
        App.token = null;
        localStorage.removeItem('token');
        UI.updateHeader();
        UI.showNotification('Logged out successfully', 'success');
    }
};

// Project Management
const ProjectManager = {
    async createProject(projectData) {
        try {
            const response = await API.createProject(projectData);
            UI.hideModal('builder-modal');
            UI.showNotification('Project created successfully!', 'success');
            
            // Reload projects if dashboard is open
            if (document.getElementById('projects-container')) {
                UI.loadProjects();
            }
        } catch (error) {
            UI.showNotification(error.message, 'error');
        }
    },
    
    async openProject(projectId) {
        try {
            const response = await API.getProject(projectId);
            App.currentProject = response.data.project;
            UI.showModal('project-modal');
            this.loadProjectDetails();
        } catch (error) {
            UI.showNotification(error.message, 'error');
        }
    },
    
    loadProjectDetails() {
        if (!App.currentProject) return;
        
        const modal = document.getElementById('project-modal');
        if (!modal) return;
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${App.currentProject.title}</h2>
                    <button class="close-btn" onclick="UI.hideModal('project-modal')">×</button>
                </div>
                <div class="modal-body">
                    <p>${App.currentProject.description}</p>
                    <div class="project-status">
                        <span class="status status-${App.currentProject.status}">${App.currentProject.status}</span>
                    </div>
                    <div class="project-features">
                        <h3>Features</h3>
                        ${App.currentProject.features ? App.currentProject.features.map(feature => `
                            <div class="feature-item">
                                <h4>${feature.name}</h4>
                                <p>${feature.description}</p>
                                <span class="complexity">${feature.complexity}</span>
                            </div>
                        `).join('') : '<p>No features defined yet</p>'}
                    </div>
                </div>
            </div>
        `;
    },
    
    async generateFeatures(prompt) {
        if (!App.currentProject) return;
        
        try {
            const response = await API.generateFeatures(App.currentProject._id, prompt);
            UI.showNotification('Features generated successfully!', 'success');
            this.loadProjectDetails();
        } catch (error) {
            UI.showNotification(error.message, 'error');
        }
    }
};

// Enhanced Mobile Navigation
const navToggle = document.querySelector('.nav-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const overlay = document.getElementById('overlay');
const drawerClose = document.querySelector('.drawer-close');

// Mobile navigation state
let isMobileMenuOpen = false;

function setMobileOpen(isOpen) {
    if (!mobileMenu || !overlay) return;
    
    isMobileMenuOpen = isOpen;
    mobileMenu.style.display = isOpen ? 'block' : 'none';
    overlay.style.display = isOpen ? 'block' : 'none';
    document.body.classList.toggle('mobile-open', isOpen);
    
    if (navToggle) {
        navToggle.setAttribute('aria-expanded', String(isOpen));
        navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    }
    
    // Prevent body scroll when menu is open
    if (isOpen) {
        document.body.style.overflow = 'hidden';
        // Focus management for accessibility
        mobileMenu.focus();
    } else {
        document.body.style.overflow = '';
        // Return focus to toggle button
        if (navToggle) navToggle.focus();
    }
}

// Enhanced mobile menu interactions
if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', (e) => {
        e.preventDefault();
        setMobileOpen(!isMobileMenuOpen);
    });
    
    // Keyboard navigation
    navToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setMobileOpen(!isMobileMenuOpen);
        }
    });
}

if (overlay) {
    overlay.addEventListener('click', () => setMobileOpen(false));
    // Close on escape key
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setMobileOpen(false);
    });
}

if (drawerClose) {
    drawerClose.addEventListener('click', () => setMobileOpen(false));
    drawerClose.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setMobileOpen(false);
    });
}

// Close mobile menu when clicking on links
if (mobileMenu) {
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            setMobileOpen(false);
        });
    });
    
    // Trap focus within mobile menu
    mobileMenu.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            setMobileOpen(false);
        }
    });
}

// Handle window resize
window.addEventListener('resize', () => {
    if (window.innerWidth >= 768 && isMobileMenuOpen) {
        setMobileOpen(false);
    }
});

// Touch gestures for mobile menu
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchend', (e) => {
    if (!isMobileMenuOpen) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    // Swipe right to close menu
    if (deltaX > 50 && Math.abs(deltaY) < 100) {
        setMobileOpen(false);
    }
});

// Count up animations for stats
function animateCount(el){
    const target = Number(el.getAttribute('data-count')) || 0;
    const duration = 1200;
    const start = performance.now();
    function step(ts){
        const p = Math.min(1, (ts - start)/duration);
        const val = Math.floor(p * target);
        el.textContent = target >= 100 ? `${val}+` : `${val}%`;
        if(p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// Cookie Management
const CookieManager = {
    // Cookie categories
    categories: {
        necessary: true, // Always true, cannot be disabled
        analytics: false,
        marketing: false,
        functional: false
    },
    
    // Initialize cookie banner
    init() {
        // Check if user has already made a choice
        const cookieConsent = localStorage.getItem('cookieConsent');
        if (!cookieConsent) {
            this.showBanner();
        } else {
            const consent = JSON.parse(cookieConsent);
            this.categories = { ...this.categories, ...consent };
            this.applyCookieSettings();
        }
        
        this.setupEventListeners();
    },
    
    // Show cookie banner
    showBanner() {
        const banner = document.getElementById('cookie-banner');
        if (banner) {
            banner.style.display = 'block';
            setTimeout(() => banner.classList.add('show'), 100);
        }
    },
    
    // Hide cookie banner
    hideBanner() {
        const banner = document.getElementById('cookie-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => banner.style.display = 'none', 300);
        }
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Accept all cookies
        const acceptAllBtn = document.getElementById('cookie-accept-all');
        if (acceptAllBtn) {
            acceptAllBtn.addEventListener('click', () => {
                this.acceptAll();
            });
        }
        
        // Accept necessary only
        const acceptNecessaryBtn = document.getElementById('cookie-accept-necessary');
        if (acceptNecessaryBtn) {
            acceptNecessaryBtn.addEventListener('click', () => {
                this.acceptNecessary();
            });
        }
        
        // Open settings
        const settingsBtn = document.getElementById('cookie-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                UI.showModal('cookie-settings-modal');
            });
        }
        
        // Save preferences
        const savePrefsBtn = document.getElementById('save-cookie-preferences');
        if (savePrefsBtn) {
            savePrefsBtn.addEventListener('click', () => {
                this.savePreferences();
            });
        }
        
        // Accept all from settings
        const acceptAllSettingsBtn = document.getElementById('accept-all-cookies');
        if (acceptAllSettingsBtn) {
            acceptAllSettingsBtn.addEventListener('click', () => {
                this.acceptAll();
            });
        }
    },
    
    // Accept all cookies
    acceptAll() {
        this.categories = {
            necessary: true,
            analytics: true,
            marketing: true,
            functional: true
        };
        this.saveConsent();
        this.hideBanner();
        UI.hideModal('cookie-settings-modal');
        UI.showNotification('Cookie preferences saved!', 'success');
    },
    
    // Accept necessary cookies only
    acceptNecessary() {
        this.categories = {
            necessary: true,
            analytics: false,
            marketing: false,
            functional: false
        };
        this.saveConsent();
        this.hideBanner();
        UI.showNotification('Cookie preferences saved!', 'success');
    },
    
    // Save preferences from settings modal
    savePreferences() {
        const analytics = document.getElementById('analytics-cookies').checked;
        const marketing = document.getElementById('marketing-cookies').checked;
        const functional = document.getElementById('functional-cookies').checked;
        
        this.categories = {
            necessary: true,
            analytics,
            marketing,
            functional
        };
        
        this.saveConsent();
        this.hideBanner();
        UI.hideModal('cookie-settings-modal');
        UI.showNotification('Cookie preferences saved!', 'success');
    },
    
    // Save consent to localStorage
    saveConsent() {
        localStorage.setItem('cookieConsent', JSON.stringify(this.categories));
        this.applyCookieSettings();
    },
    
    // Apply cookie settings
    applyCookieSettings() {
        // Analytics cookies
        if (this.categories.analytics) {
            this.enableAnalytics();
        } else {
            this.disableAnalytics();
        }
        
        // Marketing cookies
        if (this.categories.marketing) {
            this.enableMarketing();
        } else {
            this.disableMarketing();
        }
        
        // Functional cookies
        if (this.categories.functional) {
            this.enableFunctional();
        } else {
            this.disableFunctional();
        }
    },
    
    // Enable analytics tracking
    enableAnalytics() {
        // Google Analytics or other analytics
        console.log('Analytics cookies enabled');
        // Add your analytics code here
    },
    
    // Disable analytics tracking
    disableAnalytics() {
        console.log('Analytics cookies disabled');
        // Disable analytics code here
    },
    
    // Enable marketing tracking
    enableMarketing() {
        console.log('Marketing cookies enabled');
        // Add marketing tracking code here
    },
    
    // Disable marketing tracking
    disableMarketing() {
        console.log('Marketing cookies disabled');
        // Disable marketing code here
    },
    
    // Enable functional cookies
    enableFunctional() {
        console.log('Functional cookies enabled');
        // Enable enhanced functionality
    },
    
    // Disable functional cookies
    disableFunctional() {
        console.log('Functional cookies disabled');
        // Disable enhanced functionality
    },
    
    // Get current consent
    getConsent() {
        return this.categories;
    },
    
    // Reset consent (for testing)
    resetConsent() {
        localStorage.removeItem('cookieConsent');
        this.categories = {
            necessary: true,
            analytics: false,
            marketing: false,
            functional: false
        };
        this.showBanner();
    }
};

// Mobile-specific utilities
const MobileUtils = {
    // Detect if device is mobile
    isMobile() {
        return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // Handle mobile viewport height issues
    setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    },
    
    // Prevent zoom on input focus (iOS)
    preventZoom() {
        if (this.isMobile()) {
            const inputs = document.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('focus', () => {
                    if (input.style.fontSize !== '16px') {
                        input.style.fontSize = '16px';
                    }
                });
            });
        }
    },
    
    // Add haptic feedback for supported devices
    hapticFeedback() {
        if ('vibrate' in navigator) {
            navigator.vibrate(50); // 50ms vibration
        }
    },
    
    // Optimize touch interactions
    optimizeTouch() {
        if (this.isMobile()) {
            // Add touch-action CSS for better scrolling
            document.body.style.touchAction = 'manipulation';
            
            // Prevent double-tap zoom on buttons
            const buttons = document.querySelectorAll('button, .btn');
            buttons.forEach(button => {
                button.style.touchAction = 'manipulation';
            });
        }
    },
    
    // Handle mobile keyboard events
    handleKeyboard() {
        if (this.isMobile()) {
            const inputs = document.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                input.addEventListener('focus', () => {
                    // Scroll input into view on mobile
                    setTimeout(() => {
                        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                });
            });
        }
    }
};

// Enhanced form validation for mobile
const FormValidator = {
    // Real-time validation
    validateField(field) {
        const value = field.value.trim();
        const type = field.type;
        const required = field.hasAttribute('required');
        
        // Remove existing error styling
        field.classList.remove('error');
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        let isValid = true;
        let errorMessage = '';
        
        if (required && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        } else if (value) {
            switch (type) {
                case 'email':
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid email address';
                    }
                    break;
                case 'password':
                    if (value.length < 6) {
                        isValid = false;
                        errorMessage = 'Password must be at least 6 characters';
                    }
                    break;
            }
        }
        
        if (!isValid) {
            field.classList.add('error');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.textContent = errorMessage;
            errorDiv.style.cssText = 'color: #dc3545; font-size: 0.8rem; margin-top: 0.25rem;';
            field.parentNode.appendChild(errorDiv);
        }
        
        return isValid;
    },
    
    // Validate entire form
    validateForm(form) {
        const fields = form.querySelectorAll('input[required], textarea[required], select[required]');
        let isValid = true;
        
        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize mobile utilities
    MobileUtils.setViewportHeight();
    MobileUtils.preventZoom();
    MobileUtils.optimizeTouch();
    MobileUtils.handleKeyboard();
    
    // Handle viewport height changes (mobile keyboard)
    window.addEventListener('resize', () => {
        MobileUtils.setViewportHeight();
    });
    
    // Initialize cookie management
    CookieManager.init();
    
    // Animate stats with intersection observer for better performance
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCount(entry.target);
                statsObserver.unobserve(entry.target);
            }
        });
    });
    
    document.querySelectorAll('.stat .num').forEach(el => {
        statsObserver.observe(el);
    });
    
    // Check for existing auth
    if (App.token) {
        await API.getCurrentUser();
    }
    
    // Update header
    UI.updateHeader();
    
    // Add modal event listeners
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            UI.hideModal(e.target.id);
        }
    });
    
    // Enhanced form handlers with validation
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        // Real-time validation
        const loginInputs = loginForm.querySelectorAll('input');
        loginInputs.forEach(input => {
            input.addEventListener('blur', () => FormValidator.validateField(input));
            input.addEventListener('input', () => {
                // Clear error on input
                input.classList.remove('error');
                const error = input.parentNode.querySelector('.field-error');
                if (error) error.remove();
            });
        });
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!FormValidator.validateForm(loginForm)) {
                MobileUtils.hapticFeedback();
                return;
            }
            
            const formData = new FormData(e.target);
            await Auth.login(formData.get('email'), formData.get('password'));
        });
    }
    
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        // Real-time validation
        const registerInputs = registerForm.querySelectorAll('input');
        registerInputs.forEach(input => {
            input.addEventListener('blur', () => FormValidator.validateField(input));
            input.addEventListener('input', () => {
                // Clear error on input
                input.classList.remove('error');
                const error = input.parentNode.querySelector('.field-error');
                if (error) error.remove();
            });
        });
        
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!FormValidator.validateForm(registerForm)) {
                MobileUtils.hapticFeedback();
                return;
            }
            
            const formData = new FormData(e.target);
            await Auth.register(formData.get('name'), formData.get('email'), formData.get('password'));
        });
    }
    
    const builderForm = document.getElementById('builder-form');
    if (builderForm) {
        // Real-time validation
        const builderInputs = builderForm.querySelectorAll('input, textarea, select');
        builderInputs.forEach(input => {
            input.addEventListener('blur', () => FormValidator.validateField(input));
            input.addEventListener('input', () => {
                // Clear error on input
                input.classList.remove('error');
                const error = input.parentNode.querySelector('.field-error');
                if (error) error.remove();
            });
        });
        
        builderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!FormValidator.validateForm(builderForm)) {
                MobileUtils.hapticFeedback();
                return;
            }
            
            const formData = new FormData(e.target);
            const projectData = {
                title: formData.get('title'),
                description: formData.get('description'),
                category: formData.get('category')
            };
            await ProjectManager.createProject(projectData);
        });
    }
    
    // Add mobile-specific event listeners
    if (MobileUtils.isMobile()) {
        // Add pull-to-refresh functionality
        let startY = 0;
        let currentY = 0;
        let isPulling = false;
        
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        });
        
        document.addEventListener('touchmove', (e) => {
            if (isPulling && window.scrollY === 0) {
                currentY = e.touches[0].clientY;
                const pullDistance = currentY - startY;
                
                if (pullDistance > 100) {
                    // Trigger refresh
                    window.location.reload();
                    isPulling = false;
                }
            }
        });
        
        document.addEventListener('touchend', () => {
            isPulling = false;
        });
        
        // Add swipe gestures for modals
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            let modalStartY = 0;
            
            modal.addEventListener('touchstart', (e) => {
                modalStartY = e.touches[0].clientY;
            });
            
            modal.addEventListener('touchend', (e) => {
                const modalEndY = e.changedTouches[0].clientY;
                const deltaY = modalEndY - modalStartY;
                
                // Swipe down to close modal
                if (deltaY > 100) {
                    const closeBtn = modal.querySelector('.close-btn');
                    if (closeBtn) closeBtn.click();
                }
            });
        });
    }
});


