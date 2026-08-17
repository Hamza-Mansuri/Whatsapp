export const INITIAL_CONVERSATIONS = [
  {
    id: 1,
    name: "Sarah Jenkins",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
    status: "online",
    unreadCount: 2,
    messages: [
      { id: 1, text: "Hey! Are you attending the planning meeting today?", timestamp: "09:30 AM", sender: "them" },
      { id: 2, text: "Yes, I will be there. What time is it?", timestamp: "09:32 AM", sender: "me" },
      { id: 3, text: "It's at 11:00 AM in the main conference room.", timestamp: "09:35 AM", sender: "them" },
      { id: 4, text: "Awesome, I'll see you there soon!", timestamp: "09:36 AM", sender: "me" },
      { id: 5, text: "Don't forget to bring the project slides!", timestamp: "10:01 AM", sender: "them" },
      { id: 6, text: "And could you grab a coffee for me if you have time? ☕", timestamp: "10:02 AM", sender: "them" }
    ]
  },
  {
    id: 2,
    name: "Alex Rivera",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
    status: "last seen 30m ago",
    unreadCount: 0,
    messages: [
      { id: 1, text: "Can you review the pull request I submitted?", timestamp: "Yesterday", sender: "them" },
      { id: 2, text: "Sure, let me check it out now.", timestamp: "Yesterday", sender: "me" },
      { id: 3, text: "Looks great! Just approved and merged it.", timestamp: "Yesterday", sender: "me" },
      { id: 4, text: "Thanks for the quick review!", timestamp: "Yesterday", sender: "them" }
    ]
  },
  {
    id: 3,
    name: "Tech Design Group",
    avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&h=100&fit=crop",
    status: "group - 5 participants",
    unreadCount: 5,
    messages: [
      { id: 1, text: "Let's update the styling guidelines.", timestamp: "08:15 AM", sender: "them" },
      { id: 2, text: "I agree, the new layout feels much cleaner.", timestamp: "08:20 AM", sender: "them" },
      { id: 3, text: "Did we decide on using Plus Jakarta Sans?", timestamp: "08:22 AM", sender: "them" },
      { id: 4, text: "Yes, it looks amazing on mobile screens.", timestamp: "08:45 AM", sender: "them" },
      { id: 5, text: "I'll upload the design tokens today.", timestamp: "09:00 AM", sender: "them" }
    ]
  },
  {
    id: 4,
    name: "Emma Watson",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces",
    status: "online",
    unreadCount: 0,
    messages: [
      { id: 1, text: "Hey! Did we finish the Phase 1 goals?", timestamp: "Monday", sender: "me" },
      { id: 2, text: "Yes, we just completed the chat interface layouts.", timestamp: "Monday", sender: "them" },
      { id: 3, text: "Perfect, let's keep iterating.", timestamp: "Monday", sender: "me" }
    ]
  },
  {
    id: 5,
    name: "David Kim",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
    status: "last seen 3h ago",
    unreadCount: 0,
    messages: [
      { id: 1, text: "Are you free for lunch tomorrow?", timestamp: "Sunday", sender: "them" },
      { id: 2, text: "Yeah! Let's check out that new ramen place downtown.", timestamp: "Sunday", sender: "me" }
    ]
  }
];
