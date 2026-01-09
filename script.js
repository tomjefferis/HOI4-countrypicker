// State
let players = []; // No default players
let picksPerPlayer = 3;
let pickOrder = [];
let assignments = {}; // { 'Player Name': [Country1, Country2] }
let currentPhase = 'setup'; // 'setup', 'order', 'country'
let availableCountries = [...countries]; // Cone from countries.js
let orderQueue = []; // Used during drafting to know whose turn it is

// Wheel Graphics Globals
let currentRotation = 0;
let isSpinning = false;
let spinVelocity = 0;
let animationId = null;

// Mouse Interaction Globals
let isDragging = false;
let lastMouseAngle = 0;
let lastTimestamp = 0;
let dragVelocity = 0;

// Audio
const wheelAudio = new Audio('audios/wheelspin.mp3');
const crateAudio = new Audio('audios/pageturn.mp3');

// DOM Elements
const sections = {
    setup: document.getElementById('setup-phase'),
    order: document.getElementById('order-phase'),
    country: document.getElementById('country-phase'),
    summary: document.getElementById('summary-phase')
};

// --- Helper Functions ---
function switchPhase(phase) {
    currentPhase = phase;
    Object.values(sections).forEach(d => d.classList.add('hidden'));
    sections[phase].classList.remove('hidden');
    
    if (phase === 'order') {
        initOrderWheel();
        setupWheelInteractions('order-wheel', tempOrderList, 'spin-order-btn', (w, i) => handleOrderWin(w, i));
    } else if (phase === 'country') {
        // initCountryWheel(); // Disabled in favor of Crates
        startDraft();
        renderCrates();
        // setupWheelInteractions('country-wheel', availableCountries, 'spin-country-btn', (w, i) => handleCountryWin(w, i));
    } else if (phase === 'summary') {
        renderSummary();
    }
}

// --- Interaction Handling ---
function setupWheelInteractions(canvasId, items, buttonId, onWin) {
    const canvas = document.getElementById(canvasId);
    const btn = document.getElementById(buttonId);
    
    // Clear old listeners if needed (simple way: clone node, but state management is trickier with global vars)
    // For this simple app, we'll just re-assign onclicks and manage canvas events carefully.
    
    // Button Click
    btn.onclick = () => {
        if (!isSpinning && items.length > 0) {
            startSpinning(0.5 + Math.random() * 0.5, items, canvasId, onWin);
        }
    };

    // Mouse Events for Canvas
    canvas.onmousedown = (e) => {
        if (isSpinning || items.length === 0) return;
        isDragging = true;
        lastMouseAngle = getMouseAngle(e, canvas);
        dragVelocity = 0;
        lastTimestamp = performance.now();
        canvas.style.cursor = 'grabbing';
    };

    window.onmousemove = (e) => {
        if (!isDragging) return;
        
        const currentAngle = getMouseAngle(e, canvas);
        let delta = currentAngle - lastMouseAngle;
        
        // Handle wrapping around PI/-PI
        if (delta > Math.PI) delta -= 2 * Math.PI;
        if (delta < -Math.PI) delta += 2 * Math.PI;

        currentRotation += delta;
        lastMouseAngle = currentAngle;

        // Calculate velocity for throw
        const now = performance.now();
        const dt = now - lastTimestamp;
        if (dt > 0) {
            dragVelocity = delta; // Simple delta, smoothing can be added
        }
        lastTimestamp = now;

        drawWheel(canvasId, items, currentRotation);
    };

    window.onmouseup = () => {
        if (!isDragging) return;
        isDragging = false;
        canvas.style.cursor = 'grab';

        // Check if throw was fast enough
        if (Math.abs(dragVelocity) > 0.05) {
            // Cap velocity
            const throwSpeed = Math.min(Math.abs(dragVelocity) * 2, 0.8);
            // Sign of velocity determines direction, but our spin logic usually assumes positive decay.
            // Let's force positive direction for simplicity or handle direction.
            // For now, simple standard spin:
            startSpinning(throwSpeed, items, canvasId, onWin);
        }
    };
}

function getMouseAngle(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - canvas.width / 2;
    const y = e.clientY - rect.top - canvas.height / 2;
    return Math.atan2(y, x);
}

// --- Setup Phase ---
function renderRecruitList() {
    const list = document.getElementById('recruit-list');
    list.innerHTML = '';
    players.forEach((p, idx) => {
        const li = document.createElement('li');
        li.textContent = p;
        const btn = document.createElement('button');
        btn.textContent = 'X';
        btn.className = 'remove-btn';
        btn.onclick = () => {
            players.splice(idx, 1);
            renderRecruitList();
        };
        li.appendChild(btn);
        list.appendChild(li);
    });
}

document.getElementById('add-player-btn').addEventListener('click', () => {
    const input = document.getElementById('new-player-name');
    const name = input.value.trim();
    if (name) {
        players.push(name);
        input.value = '';
        renderRecruitList();
    }
});

document.getElementById('start-btn').addEventListener('click', () => {
    if (players.length < 1) {
        alert("Need at least one recruit!");
        return;
    }
    picksPerPlayer = parseInt(document.getElementById('picks-input').value) || 3;
    switchPhase('order');
});
// --- Wheel Logic (Generic) ---
function drawWheel(canvasId, items, rotation) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) - 20; // More padding for outer ring
    const arc = (2 * Math.PI) / (items.length || 1);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Outer decorative ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 15, 0, 2 * Math.PI);
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
    ctx.strokeStyle = "#cdb896";
    ctx.lineWidth = 4;
    ctx.stroke();

    if (items.length === 0) {
        ctx.fillStyle = "#cdb896";
        ctx.font = "20px 'Courier New'";
        ctx.textAlign = "center";
        ctx.fillText("EMPTY", cx, cy);
        return;
    }

    // Draw Segments
    items.forEach((item, i) => {
        const angle = rotation + (i * arc);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, angle, angle + arc);
        
        // Theme Colors
        // Alternating dark grays/browns for military feel by default
        const colors = ['#3e424b', '#48443e', '#5a5a5a', '#3f4538'];
        ctx.fillStyle = colors[i % colors.length];

        // Specific overrides
        if (typeof item === 'string') {
             // Keep names simple alternating
             ctx.fillStyle = colors[i % colors.length];
        } else {
             // For countries, generate distinct colors procedurally if requested 
             // or check if it matches country wheel logic. 
             // Let's generate a unique HSL for every country to ensure they are different
             // Use Golden Angle to separate colors
             const hue = (i * 137.5 + 20) % 360; 
             // Desaturate slightly to keep military feel? Or keep vibrant?
             // User wanted "different colour", let's make them distinguishable but not neon.
             ctx.fillStyle = `hsl(${hue}, 40%, 45%)`;
        }

        ctx.fill();
        ctx.strokeStyle = "#2b2b2b";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Text
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#e0e0e0";
        ctx.font = "bold 18px 'Courier New'";
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 4;
        
        const text = typeof item === 'string' ? item : item.name;
        // Truncate if too long
        const maxChars = 18;
        const displayText = text.length > maxChars ? text.substring(0, maxChars) + '..' : text;
        
        ctx.fillText(displayText, radius - 20, 6);
        ctx.restore();
    });

    // Center Hub
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, 2 * Math.PI);
    ctx.fillStyle = "#cdb896";
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw Pointer (Fixed at right - 0 radians in canvas arc logic)
    // Actually standard math 0 radians is right.
    // Let's create a nice triangle pointer
    ctx.beginPath();
    ctx.moveTo(cx + radius - 10, cy); // Tip touching the wheel (Inner)
    ctx.lineTo(cx + radius + 20, cy - 15); // Top corner (Outer)
    ctx.lineTo(cx + radius + 20, cy + 15); // Bottom corner (Outer)
    ctx.closePath();
    ctx.fillStyle = "#8b3837"; // Red pointer
    ctx.fill();
    ctx.strokeStyle = "#cdb896";
    ctx.lineWidth = 2;
    ctx.stroke();
}

function startSpinning(initialVelocity, items, canvasId, onFinish) {
    if (isSpinning) return;
    isSpinning = true;
    spinVelocity = initialVelocity;
    
    // Play Spin Audio
    wheelAudio.currentTime = 0;
    wheelAudio.play().catch(e => console.warn("Audio play blocked", e));

    function animate() {
        spinVelocity *= 0.985; // Friction
        currentRotation += spinVelocity;
        
        drawWheel(canvasId, items, currentRotation);

        if (spinVelocity > 0.002) {
            animationId = requestAnimationFrame(animate);
        } else {
            isSpinning = false;
            determineWinner(items, currentRotation, onFinish);
        }
    }
    animate();
}

function determineWinner(items, finalRotation, onFinish) {
    const total = items.length;
    const arc = (2 * Math.PI) / total;
    
    // Normalize rotation
    const normalizedRot = finalRotation % (2 * Math.PI);
    
    // Pointer is at 0 (Right side).
    // We need to find which segment overlaps 0.
    // Segment i starts at: normalizedRot + i*arc
    // Segment i ends at: normalizedRot + (i+1)*arc
    // We want angle 0 (or 2PI) to be within [start, end].
    // Math: start <= 0 (mod 2PI) <= end
    // Easier inverse: The pointer is at angle -normalizedRot relative to wheel start.
    
    let pointerAngle = (2 * Math.PI - normalizedRot) % (2 * Math.PI);
    if (pointerAngle < 0) pointerAngle += 2 * Math.PI;
    
    const index = Math.floor(pointerAngle / arc);
    const winnerIndex = index % total; // Safety
    
    onFinish(items[winnerIndex], winnerIndex);
}

// --- Pick Order Phase ---
let tempOrderList = [];

function initOrderWheel() {
    tempOrderList = [...players];
    drawWheel('order-wheel', tempOrderList, currentRotation);
}

function handleOrderWin(winner, index) {
    // Winner logic refactored out of event listener
    pickOrder.push(winner);
    tempOrderList.splice(index, 1);
    
    const ul = document.getElementById('order-list');
    const li = document.createElement('li');
    li.textContent = `${pickOrder.length}. ${winner}`;
    ul.appendChild(li);

    // Auto-select the last player if only one remains
    if (tempOrderList.length === 1) {
        const lastPlayer = tempOrderList[0];
        pickOrder.push(lastPlayer);
        tempOrderList = []; // Empty the list
        
        const liLast = document.createElement('li');
        liLast.textContent = `${pickOrder.length}. ${lastPlayer}`;
        ul.appendChild(liLast);
    }

    drawWheel('order-wheel', tempOrderList, currentRotation);

    if (tempOrderList.length === 0) {
        document.getElementById('spin-order-btn').classList.add('hidden');
        document.getElementById('to-country-phase-btn').classList.remove('hidden');
        document.getElementById('order-wheel').classList.add('hidden');
    }
}

// Removed old specific event listeners in favor of setupWheelInteractions
// document.getElementById('spin-order-btn').addEventListener... (Deleted)

document.getElementById('to-country-phase-btn').addEventListener('click', () => {
    switchPhase('country');
});

// --- Country Selection Phase ---
let draftRound = 0;
let pickIndex = 0;

function startDraft() {
    // Generate the full queue of picks: Player A, A, A, B, B, B...
    orderQueue = [];
    pickOrder.forEach(p => {
        for (let i = 0; i < picksPerPlayer; i++) {
            orderQueue.push(p);
        }
    });
    pickIndex = 0;
    updateDraftUI();
}

function updateDraftUI() {
    if (pickIndex >= orderQueue.length) {
        document.getElementById('current-picker-display').textContent = "All picks complete!";
        document.getElementById('spin-country-btn').disabled = true;
        document.getElementById('spin-country-btn').textContent = "COMPLETED";
        return;
    }
    const player = orderQueue[pickIndex];
    // Calculate which pick number this is for the current player
    const currentPickNum = (pickIndex % picksPerPlayer) + 1;
    document.getElementById('current-picker-display').textContent = `Current Picker: ${player} (Pick ${currentPickNum}/${picksPerPlayer})`;
}

function initCountryWheel() {
    drawWheel('country-wheel', availableCountries, currentRotation);
}

function handleCountryWin(country, index) {
    // Legacy function - kept if needed for reference, but crate logic replaced it.
    /*
    const player = orderQueue[pickIndex];
    if (!assignments[player]) assignments[player] = [];
    assignments[player].push(country);
    
    availableCountries.splice(index, 1);
    renderAssignments();
    
    pickIndex++;
    updateDraftUI();
    drawWheel('country-wheel', availableCountries, currentRotation);
    */
}

// Removed old specific event listeners
// document.getElementById('spin-country-btn').addEventListener... (Deleted)

// Crate Logic
let lastPickedCrate = null;
let summaryTimeout = null;

function renderCrates() {
    const grid = document.getElementById('crate-grid');
    grid.innerHTML = '';
    
    // Create a crate for each available country
    // We don't necessarily need to map 1:1 to indices if it's random, but visual count helps.
    // If availableCountries is large, this might be a lot of crates.
    // Let's generate as many crates as there are countries remaining.
    
    availableCountries.forEach((_, index) => {
        const crate = document.createElement('div');
        crate.className = 'crate';
        crate.textContent = index + 1;
        crate.dataset.index = index;
        
        crate.onclick = () => openCrate(crate);
        
        grid.appendChild(crate);
    });
}

function openCrate(crateElement) {
    if (crateElement.classList.contains('opened') || crateElement.classList.contains('disabled')) return;
    
    // Play Crate Audio
    crateAudio.currentTime = 0;
    crateAudio.play().catch(e => console.warn("Audio play blocked", e));

    // Pick a random country from available
    const randomIndex = Math.floor(Math.random() * availableCountries.length);
    const selectedCountry = availableCountries[randomIndex];
    
    // Animate
    crateElement.classList.add('opened');
    crateElement.textContent = selectedCountry.name; // Or short code
    lastPickedCrate = crateElement; // Track for Veto
    
    // Handle Win Logic
    const player = orderQueue[pickIndex];
    if (!assignments[player]) assignments[player] = [];
    assignments[player].push(selectedCountry);
    
    // Remove from available
    availableCountries.splice(randomIndex, 1);
    
    // Update assignments UI
    renderAssignments();
    
    pickIndex++;
    updateDraftUI(); // Updates current picker text
    
    // Disable this clicked box
    crateElement.onclick = null;
    
    // If we have just finished the draft, disable everything
    if (pickIndex >= orderQueue.length) {
        document.querySelectorAll('.crate').forEach(c => c.classList.add('disabled'));
        summaryTimeout = setTimeout(() => {
            switchPhase('summary');
        }, 1500);
    }
}

document.getElementById('veto-btn').addEventListener('click', () => {
    // Logic: 
    // 1. Rollback pickIndex
    // 2. Remove last assignment from that player
    // 3. Keep crate opened (it's burned)
    // 4. Update UI
    
    // Prevent double veto or veto without a pick
    if (pickIndex <= 0 || !lastPickedCrate) return;

    // If summary pending, cancel it
    if (summaryTimeout) {
        clearTimeout(summaryTimeout);
        summaryTimeout = null;
    }

    // Rollback
    pickIndex--;
    const player = orderQueue[pickIndex];
    
    // Remove assignment
    if (assignments[player] && assignments[player].length > 0) {
        assignments[player].pop();
    }
    
    // Mark visually as invalid (Red background)
    if (lastPickedCrate) {
        lastPickedCrate.style.background = "#5a1a1a";
        lastPickedCrate.style.borderColor = "#ff0000";
        lastPickedCrate.style.color = "#ff9999";
        // Optional: Strike through text? 
        // lastPickedCrate.style.textDecoration = "line-through";
        
        // Disable interaction with this specific revoked crate is handled by 'opened' class check in openCrate,
        // but we'll clear the reference so we can't veto it again.
        lastPickedCrate = null;
    }

    // Re-enable draft if it was finished
    if (pickIndex < orderQueue.length) {
         document.querySelectorAll('.crate').forEach(c => {
             if (!c.classList.contains('opened')) {
                 c.classList.remove('disabled');
             }
         });
    }

    renderAssignments();
    updateDraftUI();
});

// Initial Render
renderRecruitList();

function renderAssignments() {
    const container = document.getElementById('assignments-container');
    container.innerHTML = '';
    
    // Sort display by original pick order
    pickOrder.forEach(p => {
        if (!assignments[p]) return;
        
        const card = document.createElement('div');
        // Reset old inline styles
        card.className = ''; 
        // Use class logic or inline for vertical stack
        card.style.background = '#333';
        card.style.padding = '10px';
        card.style.border = '1px solid #555';
        card.style.width = '100%';
        card.style.marginBottom = '10px';
        
        const title = document.createElement('h4');
        title.style.margin = '0 0 10px 0';
        title.style.color = '#cdb896';
        title.style.borderBottom = '1px solid #555';
        title.textContent = p;
        card.appendChild(title);
        
        const ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        
        assignments[p].forEach(c => {
            const li = document.createElement('li');
            li.style.marginBottom = '5px';
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            
            const imgUrl = getFlagUrl(c);
            if (imgUrl) {
                const img = document.createElement('img');
                img.src = imgUrl;
                img.className = 'flag-preview';
                li.appendChild(img);
            }
            
            const span = document.createElement('span');
            span.textContent = c.name;
            li.appendChild(span);
            ul.appendChild(li);
        });
        
        card.appendChild(ul);
        container.appendChild(card);
    });
}

// Initial Render
renderRecruitList();

function renderCountrySetupList() {
    const list = document.getElementById('country-list');
    list.innerHTML = '';
    
    // Sort simply for display
    availableCountries.forEach((c, idx) => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.borderBottom = '1px solid #444';
        li.style.padding = '5px 0';

        const span = document.createElement('span');
        // Flag preview if possible
        const img = document.createElement('img');
        img.src = `https://flagcdn.com/w20/${c.code.toLowerCase()}.png`;
        img.style.marginRight = '8px';
        img.style.verticalAlign = 'middle';
        img.onerror = () => img.style.display = 'none'; // Hide if invalid code

        span.appendChild(img);
        span.appendChild(document.createTextNode(`${c.name} (${c.code})`));
        
        const btn = document.createElement('button');
        btn.textContent = 'X';
        btn.className = 'remove-btn';
        btn.onclick = () => {
            availableCountries.splice(idx, 1);
            renderCountrySetupList();
        };
        
        li.appendChild(span);
        li.appendChild(btn);
        list.appendChild(li);
    });
}

document.getElementById('add-country-btn').addEventListener('click', () => {
    const nameInput = document.getElementById('new-country-name');
    const codeInput = document.getElementById('new-country-code');
    
    const name = nameInput.value.trim();
    const code = codeInput.value.trim().toLowerCase();
    
    if (name && code) {
        availableCountries.push({ name, code, color: '#555' }); // Default color
        nameInput.value = '';
        codeInput.value = '';
        renderCountrySetupList();
    } else {
        alert("Please provide both a Name and a 2-letter ISO Code.");
    }
});

// Initial country list render
renderCountrySetupList();

// --- Summary Phase ---
function renderSummary() {
    const container = document.getElementById('final-summary-container');
    container.innerHTML = '';
    
    // Sort players by original joining order or pick order
    // Let's use pick order as it is the game order
    pickOrder.forEach(p => {
        if (!assignments[p]) return;
        
        const card = document.createElement('div');
        card.style.background = '#333';
        card.style.padding = '20px';
        card.style.border = '2px solid #cdb896';
        card.style.width = '250px';
        card.style.boxShadow = '0 5px 15px rgba(0,0,0,0.5)';
        
        const title = document.createElement('h3');
        title.style.margin = '0 0 15px 0';
        title.style.color = '#cdb896';
        title.style.borderBottom = '1px solid #555';
        title.style.paddingBottom = '5px';
        title.style.textAlign = 'center';
        title.textContent = p;
        card.appendChild(title);
        
        const ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        
        assignments[p].forEach(c => {
            const li = document.createElement('li');
            li.style.fontSize = '1.1em';
            li.style.marginBottom = '10px';
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            
            const imgUrl = getFlagUrl(c);
            if (imgUrl) {
                const img = document.createElement('img');
                img.src = imgUrl;
                img.className = 'flag-preview';
                img.style.width = '40px'; 
                img.style.height = '27px';
                li.appendChild(img);
            }
            
            const span = document.createElement('span');
            span.textContent = c.name;
            li.appendChild(span);
            ul.appendChild(li);
        });
        
        card.appendChild(ul);
        container.appendChild(card);
    });
}

document.getElementById('restart-btn').addEventListener('click', () => {
    // Reset State
    // players kept? Yes, usually people replay.
    // pickOrder cleared? Yes, re-spin order.
    // assignments cleared? Yes.
    
    // Hard vs Soft reset. User said "Draft Again".
    // I assume keep the recruit list.
    
    pickOrder = [];
    assignments = {};
    orderQueue = [];
    pickIndex = 0;
    
    // Reset Data Source
    // availableCountries depends on what the user configured in Setup.
    // If they removed countries in setup, `availableCountries` was spliced directly from `script.js` perspective?
    // Wait, `availableCountries` is a let variable initialized with `[...countries]`.
    // Changes in Setup modify `availableCountries` directly.
    // If we transition back to Setup, we probably want to "restore" the full list OR keep user changes?
    // "Draft Again" likely implies "New Game".
    // If they deleted "Siam" because they hate playing it, they want it deleted next game too.
    // BUT, the countries allocated to players were spliced out.
    // We need to retrieve them.
    
    // Re-verify the data flow:
    // Setup Phase: User adds/removes to `availableCountries`.
    // Country Phase: `availableCountries.splice` removes them.
    
    // Problem: If I restart, `availableCountries` is empty/missing used countries.
    // Solution: We need a `configuredCountries` state that persists user changes, 
    // and `availableCountries` is a clone of that for the drafting phase.
    
    // Current Code:
    // let availableCountries = [...countries];
    
    // Fix:
    // 1. Restore `availableCountries` to contain all the countries from `assignments` + current contents.
    // OR
    // 2. Just reload the page? (Easiest, but less SPA-like).
    // Let's do it properly.
    
    Object.values(assignments).forEach(list => {
        availableCountries.push(...list);
    });
    
    // Clean up UI
    document.getElementById('current-picker-display').textContent = "Current Picker: ???";
    const spinBtn = document.getElementById('spin-country-btn');
    spinBtn.disabled = false;
    spinBtn.textContent = "DRAFT COUNTRY"; // Though hidden in crate mode
    
    document.getElementById('order-list').innerHTML = ''; // Clear order list UI
    document.getElementById('assignments-container').innerHTML = ''; // Clear assignments UI
    document.getElementById('to-country-phase-btn').classList.add('hidden');
    document.getElementById('spin-order-btn').classList.remove('hidden');
    document.getElementById('order-wheel').classList.remove('hidden');

    // Go back to Order phase? Or Setup?
    // "Draft Again" -> Usually standard flow.
    // User might want to change players?
    // Let's go to Setup.
    switchPhase('setup');
});
