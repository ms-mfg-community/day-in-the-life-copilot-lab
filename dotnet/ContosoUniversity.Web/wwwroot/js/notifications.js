// notifications.js - Real-time notification system for Contoso University

document.addEventListener('DOMContentLoaded', function () {
    // Only initialize notifications if the user is an admin
    // This check can be modified based on your authentication system
    if (document.body.classList.contains('admin-user')) {
        initializeNotifications();
    }
});

function initializeNotifications() {
    // Poll for new notifications every 5 seconds
    setInterval(checkForNotifications, 5000);
    
    // Check immediately on page load
    checkForNotifications();
    
    // Add event handlers for notification actions
    document.addEventListener('click', function(e) {
        // Close button for notifications
        if (e.target.classList.contains('notification-close')) {
            const notificationElement = e.target.closest('.notification');
            const notificationId = notificationElement.dataset.id;
            markNotificationAsRead(notificationId);
            notificationElement.remove();
        }
    });
}

function checkForNotifications() {
    fetch('/api/notifications')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.notifications && data.notifications.length > 0) {
                showNotifications(data.notifications);
            }
        })
        .catch(error => console.error('Error checking for notifications:', error));
}

function showNotifications(notifications) {
    const container = document.getElementById('notifications-container') || createNotificationsContainer();
    
    // Limit the number of displayed notifications to avoid cluttering the UI
    const maxVisibleNotifications = 5;
    
    // Remove excess notifications if we're already at or over the limit
    const currentNotifications = container.querySelectorAll('.notification');
    if (currentNotifications.length >= maxVisibleNotifications) {
        for (let i = maxVisibleNotifications - 1; i < currentNotifications.length; i++) {
            currentNotifications[i].remove();
        }
    }
    
    // Add new notifications (newest first)
    for (let i = 0; i < notifications.length && i < maxVisibleNotifications; i++) {
        const notification = notifications[i];
        
        // Skip if this notification is already displayed
        if (document.querySelector(`.notification[data-id="${notification.id}"]`)) {
            continue;
        }
        
        const notificationElement = createNotificationElement(notification);
        
        // Add to the beginning of the container
        if (container.firstChild) {
            container.insertBefore(notificationElement, container.firstChild);
        } else {
            container.appendChild(notificationElement);
        }
        
        // Auto-dismiss after 60 seconds
        setTimeout(() => {
            if (notificationElement.parentNode) {
                notificationElement.classList.add('fade-out');
                setTimeout(() => {
                    if (notificationElement.parentNode) {
                        notificationElement.remove();
                    }
                }, 500);
            }
        }, 60000);
    }
}

function createNotificationsContainer() {
    const container = document.createElement('div');
    container.id = 'notifications-container';
    container.className = 'notifications-container';
    document.body.appendChild(container);
    return container;
}

function createNotificationElement(notification) {
    const element = document.createElement('div');
    element.className = `notification ${notification.type.toLowerCase()}`;
    element.dataset.id = notification.id;
    
    const header = document.createElement('div');
    header.className = 'notification-header';
    
    const title = document.createElement('span');
    title.className = 'notification-title';
    title.textContent = notification.title;
    
    const date = document.createElement('span');
    date.className = 'notification-date';
    date.textContent = formatDate(notification.createdAt);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close notification');
    
    header.appendChild(title);
    header.appendChild(date);
    header.appendChild(closeBtn);
    
    const body = document.createElement('div');
    body.className = 'notification-body';
    body.textContent = notification.message;
    
    element.appendChild(header);
    element.appendChild(body);
    
    // Add animation
    element.classList.add('notification-enter');
    setTimeout(() => element.classList.remove('notification-enter'), 500);
    
    return element;
}

function markNotificationAsRead(notificationId) {
    fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ id: notificationId })
    })
    .catch(error => console.error('Error marking notification as read:', error));
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}
