const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Push Notifications is working !');
});

let sentNotifications = [];

const fetchLatestNotices = async () => {
    try {
        const response = await axios.get('https://gauhati.ac.in/');
        if (typeof response.data === 'string') {
            const $ = cheerio.load(response.data);
            const latestNotices = [];
            $('.latestnotifications .sidebar_post ul li').each((index, element) => {
                const title = $(element).find('.title a').text().trim();
                const url = $(element).find('.title a').attr('href');
                const date = $(element).find('.date').text().trim();
                latestNotices.push({ title, url, date });
            });
            return latestNotices;
        } else {
            throw new Error('Unexpected response format');
        }
    } catch (error) {
        console.error('Failed to fetch latest notices:', error.message);
        return [];
    }
};

const sendPushNotification = async (notice) => {
    try {
        const currentTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
        const response = await axios.post('https://app.nativenotify.com/api/notification', {
            appId: process.env.APP_ID,
            appToken: process.env.APP_TOKEN,
            title: "New Notice Published 😊!",
            body: notice.title,
            dateSent: currentTime,
            pushData: { "yourProperty": "yourPropertyValue" },
            bigPictureURL: ""
        });
        console.log(`Notification sent for notice: ${notice.title}`, response.data);
    } catch (error) {
        console.error('Failed to send push notification:', error.message);
    }
};

const checkForNewNotices = async () => {
    const latestNotices = await fetchLatestNotices();

    const currentDate = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
    const testDate = '08/09/2024';

    for (const notice of latestNotices) {
        console.log('Checking notice:', notice);
        if (notice.date === currentDate && !sentNotifications.some(n => n.title === notice.title)) {
            await sendPushNotification(notice);
            sentNotifications.push({ title: notice.title, date: new Date() });
            console.log('Notification sent for:', notice.title);
        }
    }

    // Remove notifications older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    sentNotifications = sentNotifications.filter(notification => notification.date > oneDayAgo);
};

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    setInterval(checkForNewNotices, 30 * 60 * 1000);
});
