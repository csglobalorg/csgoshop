const fs = require('fs');
let content = fs.readFileSync('script.js', 'utf8');

const routeLogic = `
window.addEventListener('hashchange', handleRoute);

function handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'home';
    const [page, param] = hash.split('?');
    
    let decodedParam = null;
    if (param) {
        const urlParams = new URLSearchParams(param);
        decodedParam = urlParams.get('q') || urlParams.get('cat') || urlParams.get('id');
    }

    window.scrollTo(0, 0);
    if (typeof closeMobileMenu === 'function') closeMobileMenu();
    if (typeof closeMobileSearch === 'function') closeMobileSearch(); 
    if (typeof hideStickyBar === 'function') hideStickyBar();
    
    if (typeof mainContent !== 'undefined' && mainContent) {
        mainContent.classList.remove('reveal');
        void mainContent.offsetWidth;
        mainContent.classList.add('reveal');
    }
    
    const globalBottom = document.getElementById('global-bottom-sections');
    if (globalBottom) {
        const user = JSON.parse(localStorage.getItem('csgo_user'));
        if (page === 'account' && user) {
            globalBottom.style.display = 'none';
        } else {
            globalBottom.style.display = 'block';
        }
    }
    
    if (typeof refreshIcons === 'function') setTimeout(refreshIcons, 100);
    
    switch(page) {
        case 'categories':
            if (typeof renderCategories === 'function') renderCategories();
            else if (typeof mainContent !== 'undefined') mainContent.innerHTML = '<h2 class="text-white text-center mt-10">Categories Coming Soon</h2>';
            break;
        case 'affiliate':
            if (typeof renderAffiliate === 'function') renderAffiliate();
            else if (typeof mainContent !== 'undefined') mainContent.innerHTML = '<h2 class="text-white text-center mt-10">Affiliate Portal Coming Soon</h2>';
            break;
        case 'home':
            if (typeof renderHome === 'function') renderHome();
            break;
        case 'products':
            if (typeof renderProductList === 'function') renderProductList(decodedParam);
            break;
        case 'search':
            if (typeof renderProductList === 'function') renderProductList(null, decodedParam);
            break;
        case 'product-details':
            if (typeof renderProductDetails === 'function') renderProductDetails(decodedParam);
            break;
        case 'about':
            if (typeof renderAbout === 'function') renderAbout();
            break;
        case 'checkout':
            if (typeof renderCheckout === 'function') renderCheckout();
            break;
        case 'cart':
            if (typeof renderCart === 'function') renderCart();
            break;
        case 'account':
            if (typeof renderAccount === 'function') renderAccount();
            break;
        default:
            if (typeof renderHome === 'function') renderHome();
    }
}
`;

if (!content.includes('function handleRoute')) {
    fs.writeFileSync('script.js', content + '\n' + routeLogic);
    console.log('Appended handleRoute successfully');
} else {
    console.log('handleRoute already exists');
}
