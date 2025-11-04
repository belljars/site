// Navigation menu data - edit this array to update the navigation links
const navigationLinks = [
    { text: 'home', url: 'home.html' },
    { text: 'things', url: 'things.html' }
];

// Footer content - edit this object to update the footer
const footerContent = {
    copyright: `© ${new Date().getFullYear()} Your Website Name`,
    links: [
        { text: 'source', url: 'https://github.com/belljars/site' },
        { text: 'email', url: 'mailto:szalonek99@gmail.com' },
        { text: 'set beliefs', url: 'beliefs.html' }
    ]
};

// Function to generate the navigation menu
function generateNavigation() {
    const navElement = document.getElementById('nav');
    if (!navElement) return;

    const navList = document.createElement('ul');
    navList.className = 'nav-list';

    navigationLinks.forEach(link => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        
        a.textContent = link.text;
        a.href = link.url;
        
        li.appendChild(a);
        navList.appendChild(li);
    });

    navElement.appendChild(navList);
}

// Function to generate the footer
function generateFooter() {
    const footerElement = document.getElementById('footer');
    if (!footerElement) return;

    // Create footer sections
    const copyright = document.createElement('div');
    copyright.className = 'footer-copyright';
    copyright.textContent = footerContent.copyright;

    const links = document.createElement('div');
    links.className = 'footer-links';
    footerContent.links.forEach(link => {
        const a = document.createElement('a');
        a.href = link.url;
        a.textContent = link.text;
        links.appendChild(a);
    });

    // Append all sections to footer
    footerElement.appendChild(copyright);
    footerElement.appendChild(links);
}

// Generate both navigation and footer when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    generateNavigation();
    generateFooter();
});
