import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-analytics.js";
import { getDatabase, ref, get, push, set, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

// ============================================
// FIREBASE CONFIG
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyDWY4_Qu891TbNPCGdhC_Vqd70Oai3OPyM",
    authDomain: "test-dd24c.firebaseapp.com",
    databaseURL: "https://test-dd24c-default-rtdb.firebaseio.com",
    projectId: "test-dd24c",
    storageBucket: "test-dd24c.firebasestorage.app",
    messagingSenderId: "608816722136",
    appId: "1:608816722136:web:8bfe2f6e2759c16e98a7ad",
    measurementId: "G-2HG25VYL99"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase();
const auth = getAuth(app);

// ============================================
// STATE MANAGEMENT
// ============================================
let currentUserUID = null;
let receiverUID = null;
let selectedUserData = null;
let currentChatId = null;
let messagesUnsubscribe = null;
let isMessageHandlerSetup = false;

const usersRef = ref(db, "users");
const usersListContainer = document.getElementById("users-list-container");

// ============================================
// SERVICES / BUSINESS LOGIC
// ============================================

// Fetch all users from database
async function listenToUsers() {
    try {
        const snapshot = await get(usersRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error("Error fetching users:", error);
        return null;
    }
}

// Search/filter users in sidebar
function setupSearchUsers() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const userItems = document.querySelectorAll('#users-list > div');
        
        userItems.forEach(item => {
            const userName = item.querySelector('h3')?.textContent.toLowerCase() || '';
            if (userName.includes(query)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

// Listen to messages in real-time for a specific conversation
function listenToMessages(receiverUID) {
    // Unsubscribe from previous listener if exists
    if (messagesUnsubscribe) {
        messagesUnsubscribe();
    }
    
    const messagesRef = ref(db, `messages/${currentUserUID}/${receiverUID}`);
    
    messagesUnsubscribe = onValue(messagesRef, (snapshot) => {
        if (snapshot.exists()) {
            displayMessages(snapshot.val());
        } else {
            const messageArea = document.getElementById('message-container');
            if (messageArea) {
                messageArea.innerHTML = '<div class="p-8 text-center text-gray-500">No messages yet. Start the conversation!</div>';
            }
        }
    }, (error) => {
        console.error("Error listening to messages:", error);
    });
}

// Fetch messages for a specific conversation
async function fetchMessages(recipientUID) {
    try {
        const snapshot = await get(ref(db, `messages/${currentUserUID}/${recipientUID}`));
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error("Error fetching messages:", error);
        return null;
    }
}

// Send message to recipient
async function sendMessage(toUserUID, message) {
    if (!currentUserUID) {
        console.error("User not authenticated");
        return false;
    }
    
    try {
        const newMessageRefSender = push(ref(db, `messages/${currentUserUID}/${toUserUID}`));
        const newMessageRefRecipient = push(ref(db, `messages/${toUserUID}/${currentUserUID}`));
        
        await set(newMessageRefSender, {
            from: currentUserUID,
            text: message,
            timestamp: Date.now()
        });
        
        await set(newMessageRefRecipient, {
            from: currentUserUID,
            text: message,
            timestamp: Date.now()
        });
        
        return true;
    } catch (error) {
        console.error("Error sending message:", error);
        return false;
    }
}

// ============================================
// UI FUNCTIONS
// ============================================

// Render users list in sidebar
function renderUsers(users) {
    usersListContainer.innerHTML = "";
    const usersList = document.createElement("div");
    usersList.id = "users-list";
    usersList.className = "space-y-1 xs:space-y-0.5 transition-all duration-300";
    
    const sidebar = document.getElementById('sidebar');
    const isCurrentlyCollapsed = sidebar?.getAttribute('data-collapsed') === 'true';
    
    Object.entries(users).forEach(([uid, user]) => {
        if (uid === currentUserUID) return;
        
        const item = document.createElement("div");
        item.className = "flex items-center gap-3 p-2 xs:p-2.5 mx-2 xs:mx-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200 md:data-[collapsed=true]:flex-col md:data-[collapsed=true]:gap-1 md:data-[collapsed=true]:p-2 md:data-[collapsed=true]:justify-center group";
        item.dataset.uid = uid;
        item.dataset.selected = 'false';
        
        // Avatar with online indicator
        const avatarWrapper = document.createElement("div");
        avatarWrapper.className = "relative flex-shrink-0";
        
        const avatar = document.createElement("div");
        avatar.className = "w-12 xs:w-13 sm:w-12 h-12 xs:h-13 sm:h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:shadow-md";
        
        if (user.profile_picture) {
            avatar.style.backgroundImage = `url('${user.profile_picture}')`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            avatar.style.background = undefined;
        } else {
            const initial = document.createElement("span");
            initial.className = "text-white font-bold text-sm xs:text-base";
            initial.textContent = (user.name || "?")[0].toUpperCase();
            avatar.appendChild(initial);
        }
        
        avatarWrapper.appendChild(avatar);
        
        // User info
        const info = document.createElement("div");
        info.className = "flex-1 min-w-0 transition-all duration-300";
        
        const name = document.createElement("h3");
        name.className = "text-sm xs:text-base font-semibold truncate text-black dark:text-black group-hover:text-blue-500";
        name.textContent = user.name || "Unknown";
        
        info.appendChild(name);
        
        item.appendChild(avatarWrapper);
        item.appendChild(info);
        
        // Add click handler to update UI
        item.addEventListener('click', () => {
            // Update all items
            document.querySelectorAll('#users-list > div').forEach(el => {
                el.dataset.selected = 'false';
                el.classList.remove('bg-blue-50', 'dark:bg-blue-900');
            });
            // Mark this one as selected
            item.dataset.selected = 'true';
            item.classList.add('bg-blue-50', 'dark:bg-blue-900');
        });
        
        usersList.appendChild(item);
    });
    
    usersListContainer.appendChild(usersList);
    setupSearchUsers();
}

// Display error/loading state in users list
function setUsersListState(state, message) {
    usersListContainer.innerHTML = `<p class="text-sm ${state === 'error' ? 'text-red-400' : 'text-slate-400'} text-center py-4">${message}</p>`;
}

// Show loading spinner
function showLoadingSpinner(show = true) {
    const spinner = document.getElementById('dashboard-loading-spinner');
    if (spinner) spinner.style.display = show ? 'flex' : 'none';
}

// Initialize message area with empty state
function initializeMessageArea() {
    const messageArea = document.getElementById('message-container');
    if (messageArea) {
        messageArea.innerHTML = `
            <div class="flex items-center justify-center h-full">
                <div class="flex flex-col items-center gap-3 xs:gap-4 text-center px-4">
                    <div class="w-12 xs:w-16 h-12 xs:h-16 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg class="w-6 xs:w-8 h-6 xs:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <div>
                        <h2 class="text-base xs:text-lg font-semibold text-gray-800">No conversation selected</h2>
                        <p class="text-xs xs:text-sm text-gray-500 mt-1">Select a user from the sidebar to start chatting</p>
                    </div>
                </div>
            </div>
        `;
    }
}

// Show loading state in message area
function setMessagesLoadingState() {
    const messageArea = document.getElementById('message-container');
    if (messageArea) {
        messageArea.innerHTML = '<div class="flex items-center justify-center h-full"><div class="flex flex-col items-center gap-3"><div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div><p class="text-sm text-gray-600">Loading messages...</p></div></div>';
    }
}

// Display messages in chat area
function displayMessages(messages) {
    const messageArea = document.getElementById('message-container');
    if (!messageArea) return;
    
    if (!messages || Object.keys(messages).length === 0) {
        messageArea.innerHTML = '<div class="p-8 text-center text-gray-500">No messages yet. Start the conversation!</div>';
        return;
    }
    
    // Only render if message area is empty or has no-messages text
    if (messageArea.innerHTML.includes('No conversation selected') || 
        messageArea.innerHTML.includes('No messages yet') ||
        messageArea.innerHTML.includes('Loading messages')) {
        messageArea.innerHTML = ''; // Clear only for initial load
    }
    
    const messagesArray = Object.entries(messages)
        .map(([id, msg]) => ({
            id, 
            text: msg.text, 
            from: msg.from, 
            timestamp: msg.timestamp
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
    
    // Get existing message IDs to avoid duplicates
    const existingIds = new Set(
        Array.from(messageArea.querySelectorAll('[data-message-id]'))
            .map(el => el.dataset.messageId)
    );
    
    // Only append new messages
    messagesArray.forEach(message => {
        if (!existingIds.has(message.id)) {
            appendMessageToUI(message);
        }
    });
    
    // Scroll to bottom
    setTimeout(() => {
        messageArea.scrollTop = messageArea.scrollHeight;
    }, 0);
}

// Append single message to UI
function appendMessageToUI(message) {
    const messageArea = document.getElementById('message-container');
    if (!messageArea) return;
    
    if (messageArea.innerHTML.includes('No messages yet')) {
        messageArea.innerHTML = '';
    }
    
    const isOwn = message.from === currentUserUID;
    const messageEl = document.createElement('div');
    messageEl.className = `flex gap-2 xs:gap-3 sm:gap-4 items-end ${isOwn ? 'justify-end' : ''}`;
    messageEl.dataset.messageId = message.id; // Track message by ID to prevent duplicates
    
    messageEl.innerHTML = `
        <div class="max-w-[85%] xs:max-w-xs sm:max-w-sm lg:max-w-md space-y-1 flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-start gap-1 xs:gap-1.5 sm:gap-2">
            <div class="${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} px-3 xs:px-3.5 sm:px-4 py-1.5 xs:py-2 sm:py-3 rounded-xl xs:rounded-2xl ${isOwn ? 'rounded-br-none' : 'rounded-bl-none'} shadow-sm break-words">
                <p class="text-xs xs:text-xs sm:text-sm leading-snug">${message.text}</p>
            </div>
            <p class="text-[8px] xs:text-[9px] sm:text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap">${new Date(message.timestamp).toLocaleTimeString()}</p>
        </div>
    `;
    
    messageArea.appendChild(messageEl);
    setTimeout(() => {
        messageArea.scrollTop = messageArea.scrollHeight;
    }, 0);
}

// Update header with selected user info
function updateHeaderWithSelectedUser(user) {
    const avatarEl = document.getElementById('selected-user-avatar');
    const nameEl = document.getElementById('selected-user-name');
    const statusEl = document.getElementById('selected-user-status-text');
    
    if (avatarEl) {
        avatarEl.style.backgroundImage = user.avatar;
        avatarEl.style.backgroundSize = 'cover';
        avatarEl.style.backgroundPosition = 'center';
    }
    if (nameEl) nameEl.textContent = user.name || 'Unknown';
    if (statusEl) statusEl.textContent = 'Available';
}

// ============================================
// EVENT HANDLERS
// ============================================

// Initialize and attach event handlers to user list items
function attachUserClickHandlers() {
    const userItems = usersListContainer.querySelectorAll('[data-uid]');
    userItems.forEach(userItem => {
        userItem.addEventListener('click', handleUserClick);
    });
}

// Handle user selection from list
async function handleUserClick(e) {
    const userItem = e.currentTarget;
    const clickedUID = userItem.dataset.uid;
    receiverUID = clickedUID;
    
    // Extract user data
    const nameElement = userItem.querySelector('h3');
    const emailElement = userItem.querySelector('p');
    const avatarElement = userItem.querySelector('[class*="rounded-full"]');
    
    selectedUserData = {
        uid: clickedUID,
        name: nameElement?.textContent || 'Unknown',
        email: emailElement?.textContent || '',
        avatar: avatarElement?.style.backgroundImage || ''
    };
    
    updateHeaderWithSelectedUser(selectedUserData);
    setMessagesLoadingState();
    
    // Show chat input and user info when user is selected
    const chatInputContainer = document.getElementById('chat-input-container');
    if (chatInputContainer) {
        chatInputContainer.classList.remove('hidden');
    }
    
    const selectedUserInfo = document.getElementById('selected-user-info');
    if (selectedUserInfo) {
        selectedUserInfo.classList.remove('hidden');
    }
    
    const chatId = [currentUserUID, clickedUID].sort().join('_');
    currentChatId = chatId;
    
    // Listen to messages in real-time
    listenToMessages(clickedUID);
}

// Send message logic
async function performSendMessage() {
    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value.trim();
    
    if (validateMessageInput(messageText)) {
        const success = await sendMessage(receiverUID, messageText);
        
        if (success) {
            messageInput.value = '';
            messageInput.focus();
            // Message will appear through real-time listener (listenToMessages)
            // Don't append manually to avoid duplicates
        } else {
            alert('Failed to send message');
        }
    }
}

// Handle send message - setup click and Enter key listeners
async function handleSendMessage() {
    // Only setup once to prevent duplicate listeners
    if (isMessageHandlerSetup) return;
    isMessageHandlerSetup = true;
    
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');
    
    if (!sendBtn || !messageInput) return;
    
    // Send on click
    sendBtn.addEventListener('click', performSendMessage);
    
    // Send on Enter key (but not Shift+Enter)
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            performSendMessage();
        }
    });
}

// Validate message input
function validateMessageInput(messageText) {
    if (!messageText) {
        alert('Please type a message');
        return false;
    }
    if (!receiverUID) {
        alert('Please select a user to chat with');
        return false;
    }
    if (!currentChatId) {
        alert('Error: Chat ID not set');
        return false;
    }
    return true;
}

// ============================================
// INITIALIZATION
// ============================================

// Setup logout functionality
function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to logout?')) {
                try {
                    // Unsubscribe from messages listener
                    if (messagesUnsubscribe) {
                        messagesUnsubscribe();
                        messagesUnsubscribe = null;
                    }
                    
                    const { signOut } = await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js');
                    await signOut(auth);
                    window.location.href = '/';
                } catch (error) {
                    console.error('Logout failed:', error);
                    alert('Logout failed: ' + error.message);
                }
            }
        });
    }
}

// Setup sidebar toggle for mobile
function setupSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const closeBtn = document.getElementById('sidebar-close-btn');
    
    if (!sidebar || !toggleBtn) return;
    
    // Open sidebar
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.remove('hidden');
        overlay.classList.add('active');
        document.body.classList.add('sidebar-open');
    });
    
    // Close sidebar
    const closeSidebar = () => {
        sidebar.classList.add('hidden');
        overlay.classList.remove('active');
        document.body.classList.remove('sidebar-open');
    };
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSidebar);
    }
    
    // Close sidebar on overlay click
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeSidebar();
            }
        });
    }
    
    // Close sidebar when user is selected (on mobile)
    const userItems = sidebar.querySelectorAll('[data-uid]');
    userItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth < 640) {
                closeSidebar();
            }
        });
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 640) {
            sidebar.classList.remove('hidden');
            overlay.classList.remove('active');
            document.body.classList.remove('sidebar-open');
        }
    });
}

// Setup emoji picker
function setupEmojiPicker() {
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPanel = document.getElementById('emoji-picker-panel');
    const messageInput = document.getElementById('message-input');
    
    if (!emojiBtn || !emojiPanel) return;
    
    const emojis = ['😀', '😂', '😍', '😘', '😎', '🤔', '😴', '😤', '😍', '🥰', '😱', '🤯', '👍', '👎', '🙌', '👏', '❤️', '🔥', '💯', '✨', '🎉', '🎁', '🚀', '🌟', '💫', '⭐', '🎂', '🍕', '🍔', '🍟', '🌮', '🍜', '📱', '💻', '⌚', '🎮', '🎵', '🎸', '📚', '✏️', '📝', '🖊️', '⚽', '🏀', '🎾', '🏐'];
    
    // Populate emoji picker
    emojis.forEach(emoji => {
        const emojiBtn = document.createElement('button');
        emojiBtn.textContent = emoji;
        emojiBtn.className = 'text-xl xs:text-2xl p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer';
        emojiBtn.type = 'button';
        emojiBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (messageInput) {
                messageInput.value += emoji;
                messageInput.focus();
            }
        });
        emojiPanel.appendChild(emojiBtn);
    });
    
    // Toggle emoji picker
    emojiBtn.addEventListener('click', (e) => {
        e.preventDefault();
        emojiPanel.classList.toggle('hidden');
    });
    
    // Close emoji picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!emojiBtn.contains(e.target) && !emojiPanel.contains(e.target)) {
            emojiPanel.classList.add('hidden');
        }
    });
}

// Initialize app when DOM is ready
async function initializeMyApp() {
    // Wait for user authentication
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUserUID = user.uid;
            
            // Update current user name in sidebar
            const userNameEl = document.getElementById('current-user-name');
            if (userNameEl) userNameEl.textContent = user.displayName || user.email || 'User';
            
            initializeMessageArea();
            
            // Load users
            const users = await listenToUsers();
            if (users) {
                renderUsers(users);
                attachUserClickHandlers();
                setupSidebarToggle();
            } else {
                setUsersListState('error', 'Error loading users');
            }
            
            showLoadingSpinner(false);
            handleSendMessage();
            setupLogout();
            setupEmojiPicker();
        } else {
            window.location.href = "./";
        }
    });
}

// Start app initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMyApp);
} else {
    initializeMyApp();
}


