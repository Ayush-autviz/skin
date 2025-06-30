export const formatDate = (date) => {
  if (!date) return '';
  
  // Convert Firebase Timestamp to JS Date if needed
  const jsDate = date.toDate ? date.toDate() : new Date(date);
  
  return jsDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
};


function getFormattedUTCTime() {
  const date = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = days[date.getUTCDay()];
  const monthName = months[date.getUTCMonth()];
  const day = date.getUTCDate();
  
  let hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  
  // Convert to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // Handle midnight (0 hours)
  
  // Format minutes with leading zero if needed
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  
  return `${dayName} ${monthName} ${day} ${hours}:${formattedMinutes}${ampm}`;
}


// Add more date formatting functions as needed 