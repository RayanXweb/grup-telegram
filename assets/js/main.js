// Utility functions
export function showLoading(element) {
    element.innerHTML = '<div class="loading-spinner">Loading...</div>';
}

export function hideLoading(element) {
    element.innerHTML = '';
}

export function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('id-ID');
}

export function copyToClipboard(text) {
    return navigator.clipboard.writeText(text);
}

export function showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}
