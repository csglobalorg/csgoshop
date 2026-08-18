const fs = require('fs');
let content = fs.readFileSync('script.js', 'utf8');

const startIdx = content.indexOf('function parseCSV(');
const endIdx = content.indexOf('window.adminShowCategories = function');

if (startIdx !== -1 && endIdx !== -1) {
    const newFunc = `function parseCSV(csv) {
    if (!csv) return [];
    const products = [];
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    // Auto-detect delimiter
    let delimiter = ',';
    const firstLineMatch = csv.match(/^[^\r\n]+/);
    if (firstLineMatch) {
        const firstLine = firstLineMatch[0];
        if (firstLine.includes('\\t')) delimiter = '\\t';
        else if (!firstLine.includes(',') && firstLine.includes(';')) delimiter = ';';
    }

    // Robust CSV parsing character-by-character
    for (let i = 0; i < csv.length; i++) {
        const char = csv[i];
        const nextChar = csv[i + 1];

        if (inQuotes) {
            if (char === '"') {
                if (nextChar === '"') {
                    // Escaped quote
                    currentField += '"';
                    i++;
                } else {
                    // End of quoted field
                    inQuotes = false;
                }
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === delimiter) {
                currentRow.push(currentField.trim());
                currentField = '';
            } else if (char === '\\n' || char === '\\r') {
                currentRow.push(currentField.trim());
                if (currentRow.length > 0) rows.push(currentRow);
                currentRow = [];
                currentField = '';
                if (char === '\\r' && nextChar === '\\n') i++; // Skip extra newline char
            } else {
                currentField += char;
            }
        }
    }
    // Push the last field/row if exists
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
    }

    if (rows.length < 2) return [];

    const headers = rows[0].map(h => h.toLowerCase().trim());
    const findIdx = (possibleNames, exclude = []) => {
        let exactMatch = headers.findIndex(h => possibleNames.some(name => h === name.toLowerCase()));
        if (exactMatch !== -1) return exactMatch;
        return headers.findIndex(h => possibleNames.some(name => h.includes(name.toLowerCase()) && !exclude.some(ex => h.includes(ex))));
    };

    const idxMap = {
        category: findIdx(['main category', 'category', 'catagory']),
        subcategory: findIdx(['sub category', 'subcategory', 'subcatagory']),
        name: findIdx(['product name', 'name']),
        image: findIdx(['product image', 'image', 'thumbnail']),
        sellPrice: findIdx(['sell price', 'selling price', 'retail prince', 'retail price', 'price'], ['admin', 'cost', 'purchase']),
        costPrice: findIdx(['admin price', 'cost price', 'purchase price']),
        code: findIdx(['product code', 'code', 'sku']),
        size: findIdx(['size', 'variants']),
        desc: findIdx(['desc', 'details', 'full description'])
    };

    for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        if (values.length < 2) continue;

        let p = { custom: true };

        const getValue = (idx, def = "") => {
            if (idx === -1 || !values[idx]) return def;
            return values[idx].trim();
        };

        // Category Normalization
        let cat = getValue(idxMap.category, "Others");
        if (cat.toLowerCase().includes("women") || cat.toLowerCase().includes("woman")) cat = "Women's Fashion";
        else if (cat.toLowerCase().includes("men")) cat = "Men's Fashion";
        else if (cat.toLowerCase().includes("gedget") || cat.toLowerCase().includes("gadget")) cat = "Gadgets & Electronics";
        else if (cat.toLowerCase().includes("home")) cat = "Home & Lifestyle";
        else if (cat.toLowerCase().includes("kid")) cat = "Kids Zone";
        else if (cat.toLowerCase().includes("gift") || cat.toLowerCase().includes("custom")) cat = "Customize & Gift";
        else if (cat.toLowerCase().includes("offer")) cat = "Offer";
        
        p.category = cat;
        p.subcategory = getValue(idxMap.subcategory);
        
        p.name = getValue(idxMap.name);
        if (!p.name && idxMap.subcategory !== -1) {
            p.name = getValue(idxMap.subcategory);
        }

        p.image = getValue(idxMap.image);
        
        // Robust Price logic with Bengali support
        const sellPriceRaw = convertBengaliToEnglish(getValue(idxMap.sellPrice));
        const sellPriceStr = sellPriceRaw.replace(/[^0-9]/g, '');
        p.price = parseInt(sellPriceStr) || 0;
        p.sale_price = p.price;

        const costPriceRaw = convertBengaliToEnglish(getValue(idxMap.costPrice));
        const costPriceStr = costPriceRaw.replace(/[^0-9]/g, '');
        p.cost_price = parseInt(costPriceStr) || 0; 
        
        // SKU/Code
        let rawCode = getValue(idxMap.code) || 'CUST-' + Math.floor(Math.random() * 1000000);
        rawCode = convertBengaliToEnglish(rawCode.toString()).replace(/(SKU|Code):\\s*/gi, '').trim();
        p.product_code = rawCode;
        p.id = p.product_code;
        
        // Variants (Size)
        p.product_variants = [];
        let sizesStr = getValue(idxMap.size);
        if (sizesStr) {
            sizesStr = sizesStr.replace(/(Size):\\s*/gi, '').trim();
            const sizeList = sizesStr.split(/[\\s,|/]+/).map(s => s.trim()).filter(s => s);
            sizeList.forEach(size => {
                p.product_variants.push({ attribute: 'Size', variant: size });
            });
        }
        
        p.product_description = getValue(idxMap.desc);
        
        products.push(p);
    }
    return products;
}
`;

    content = content.substring(0, startIdx) + newFunc + content.substring(endIdx);
    fs.writeFileSync('script.js', content, 'utf8');
    console.log('Fixed script.js successfully');
} else {
    console.log('Could not find bounds');
}
