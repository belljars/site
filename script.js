const navigationLinks = [
    { text: 'home', url: 'home.html' },
    { text: 'about', url: 'about.html' },
    { text: 'things', url: 'things.html' }
];

const footerContent = {
    copyright: `© ${new Date().getFullYear()} belljars`,
    links: [
        { text: 'email', url: 'mailto:szalonek99@gmail.com' },
        { text: 'set beliefs', url: 'beliefs.html' }
    ]
};

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

function generateFooter() {
    const footerElement = document.getElementById('footer');
    if (!footerElement) return;

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

    footerElement.appendChild(copyright);
    footerElement.appendChild(links);
}

document.addEventListener('DOMContentLoaded', () => {
    generateNavigation();
    generateFooter();
});
