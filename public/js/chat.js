document.addEventListener('DOMContentLoaded', () => {
  const loginPage = document.getElementById('login-page');
  const chatPage = document.getElementById('chat-page');
  const loginForm = document.getElementById('login-form');
  const messageForm = document.getElementById('message-form');
  const messagesContainer = document.getElementById('messages-container');
  const usersContainer = document.getElementById('users-container');
  const messageInput = document.getElementById('message-input');
  const chatHeader = document.getElementById('chat-header');

  let currentUser = null;
  let currentReceiver = null;
  let socket = null;
  let token = null;
  let users = [];
  let unreadCounts = {};

  // Check if user is already logged in
  const storedToken = localStorage.getItem('token');
  if (storedToken) {
    token = storedToken;
    fetchCurrentUser();
  }

  // Login form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      token = data.access_token;
      localStorage.setItem('token', token);
      
      fetchCurrentUser();
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  });

  // Fetch current user information
  async function fetchCurrentUser() {
    try {
      const response = await fetch('/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      currentUser = await response.json();
      showChatInterface();
      initializeSocket();
      fetchUsers();
    } catch (error) {
      localStorage.removeItem('token');
      alert('Session expired. Please login again.');
    }
  }

  // Fetch all users
  async function fetchUsers() {
    try {
      const response = await fetch('/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      users = await response.json();
      renderUsers();
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  // Initialize Socket.io connection
  function initializeSocket() {
    socket = io({
      auth: {
        token,
      },
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    socket.on('new_message', (message) => {
      if (
        (currentReceiver && message.senderId === currentReceiver.id) ||
        message.senderId === currentUser.id
      ) {
        renderMessage(message);
        
        // Mark message as read if it's from the current conversation partner
        if (message.senderId === currentReceiver.id && !message.read) {
          markMessageAsRead(message.id);
        }
      } else if (message.senderId !== currentUser.id) {
        // Increment unread count for this sender
        unreadCounts[message.senderId] = (unreadCounts[message.senderId] || 0) + 1;
        renderUsers();
      }
    });

    socket.on('unread_count', (data) => {
      // Update unread counts for all users
      fetchUnreadCounts();
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      if (error.message.includes('authentication')) {
        localStorage.removeItem('token');
        showLoginInterface();
        alert('Authentication failed. Please login again.');
      }
    });
  }

  // Fetch unread message counts
  async function fetchUnreadCounts() {
    try {
      const response = await fetch('/messages/unread/count', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch unread counts');
      }

      const totalUnread = await response.json();
      
      // Now get conversation-specific unread counts
      for (const user of users) {
        if (user.id === currentUser.id) continue;
        
        try {
          const response = await fetch(`/messages/conversation/${user.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const messages = await response.json();
            unreadCounts[user.id] = messages.filter(
              msg => msg.senderId === user.id && !msg.read
            ).length;
          }
        } catch (e) {
          console.error(`Error fetching messages for user ${user.id}:`, e);
        }
      }
      
      renderUsers();
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  }

  // Mark message as read
  function markMessageAsRead(messageId) {
    socket.emit('mark_read', { messageId });
  }

  // Render users list
  function renderUsers() {
    usersContainer.innerHTML = '';
    
    users.forEach(user => {
      if (user.id === currentUser.id) return; // Skip current user
      
      const userElement = document.createElement('div');
      userElement.classList.add('user-item');
      
      if (currentReceiver && user.id === currentReceiver.id) {
        userElement.classList.add('active');
      }
      
      let userHtml = `${user.firstName} ${user.lastName}`;
      
      // Add unread badge if there are unread messages
      const unreadCount = unreadCounts[user.id] || 0;
      if (unreadCount > 0) {
        userHtml += `<span class="unread-badge">${unreadCount}</span>`;
      }
      
      userElement.innerHTML = userHtml;
      
      userElement.addEventListener('click', () => {
        selectUser(user);
      });
      
      usersContainer.appendChild(userElement);
    });
  }

  // Select a user to chat with
  function selectUser(user) {
    currentReceiver = user;
    chatHeader.textContent = `Chat with ${user.firstName} ${user.lastName}`;
    messageForm.style.display = 'flex';
    messagesContainer.innerHTML = '';
    
    // Join the conversation room
    socket.emit('join_conversation', { otherUserId: user.id });
    
    // Load conversation history
    loadConversation(user.id);
    
    // Update UI
    renderUsers();
  }

  // Load conversation history
  async function loadConversation(userId) {
    try {
      const response = await fetch(`/messages/conversation/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }

      const messages = await response.json();
      
      // Clear unread count for this user
      unreadCounts[userId] = 0;
      renderUsers();
      
      // Render messages
      messagesContainer.innerHTML = '';
      messages.forEach(message => {
        renderMessage(message);
        
        // Mark unread messages as read
        if (message.senderId === userId && !message.read) {
          markMessageAsRead(message.id);
        }
      });
      
      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  }

  // Render a message
  function renderMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    if (message.senderId === currentUser.id) {
      messageElement.classList.add('sent');
    } else {
      messageElement.classList.add('received');
    }
    
    const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
      <div>${message.content}</div>
      <div class="message-time">${time}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Send message
  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!currentReceiver) return;
    
    const content = messageInput.value.trim();
    if (!content) return;
    
    socket.emit('send_message', {
      receiverId: currentReceiver.id,
      content,
    });
    
    messageInput.value = '';
  });

  // Show chat interface
  function showChatInterface() {
    loginPage.style.display = 'none';
    chatPage.style.display = 'grid';
  }

  // Show login interface
  function showLoginInterface() {
    loginPage.style.display = 'block';
    chatPage.style.display = 'none';
  }
});
