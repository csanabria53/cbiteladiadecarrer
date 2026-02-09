const canvas = document.getElementById('gameCanvas'); 
const ctx = canvas.getContext('2d'); 
const scoreValue = document.getElementById('score-value'); 
const levelIndicator = document.getElementById('level-indicator'); 
const levelIntro = document.getElementById('level-intro'); 
const transitionOverlay = document.getElementById('transition-overlay'); 
const gameControls = document.getElementById('game-controls');

// --- SISTEMA DE AUDIO ---
function playSnd(id) {
    const s = document.getElementById(id);
    if(s) { 
        s.pause(); 
        s.currentTime = 0; 
        s.play().catch(e => console.log("Esperando interacción para sonar")); 
    }
}

// --- SISTEMA DE VOZ LATINOAMERICANA ---
function hablar(t) { 
    window.speechSynthesis.cancel(); 
    const mensaje = new SpeechSynthesisUtterance(t); 
    const voces = window.speechSynthesis.getVoices();
    
    // Prioridad: Venezuela -> México -> Latinoamérica -> Español genérico
    const vozLatina = voces.find(v => v.lang === 'es-VE') || 
                      voces.find(v => v.lang === 'es-MX') || 
                      voces.find(v => v.lang.includes('es-419')) ||
                      voces.find(v => v.lang === 'es-US');

    if (vozLatina) mensaje.voice = vozLatina;
    else mensaje.lang = 'es-MX'; 

    mensaje.rate = 1.1; 
    window.speechSynthesis.speak(mensaje); 
}
// Forzar carga de voces en algunos navegadores
window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();

// --- CARGA DE IMÁGENES ---
let imgPlayer = new Image(); imgPlayer.src = 'personaje.png';
let imgCacao = new Image(); imgCacao.src = 'mazorca.png';
let playerImgReady = false; let cacaoImgReady = false;
imgPlayer.onload = () => playerImgReady = true;
imgCacao.onload = () => cacaoImgReady = true;

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; } 
window.addEventListener('resize', resize); resize(); 

// --- VARIABLES DE JUEGO ---
let currentLevel = 1; let score = 0; let gameActive = false; let introMostradaEnEsteNivel = false; 
const gravity = 0.8; const player = { x: 80, y: 0, width: 60, height: 90, dy: 0, dx: 0, jumpForce: 19, grounded: false, speed: 10 }; 
let obstacles = [], cacaos = []; const keys = { ArrowRight: false, ArrowLeft: false }; 

const steps = [ { id: 1, text: "Cosecha: Mazorcas maduras." }, { id: 2, text: "Fermentación: Cajones de madera." }, { id: 3, text: "Secado: Al sol de Barlovento." }, { id: 4, text: "Tostado: Despertar el aroma." }, { id: 5, text: "Molienda: Licor de cacao puro." } ]; 

const triviaData = { 
    botanica: [{ q: "¿Cómo se llama científicamente el árbol de cacao?", a: ["Theobroma cacao", "Coffea arabica", "Saccharum officinarum", "Gossypium barbadense"], correct: 0 }, { q: "¿En qué parte del árbol crecen principalmente las mazorcas?", a: ["En el tronco y ramas principales", "En las puntas de las ramas", "Bajo la tierra", "En las raíces aéreas"], correct: 0 }, { q: "¿Proceso donde las semillas reposan bajo hojas de plátano?", a: ["Destilación", "Pasteurización", "Fermentación", "Carbonatación"], correct: 2 }, { q: "¿Color más común de una mazorca madura?", a: ["Azul brillante", "Amarillo o Naranja", "Gris cenizo", "Negro intenso"], correct: 1 }, { q: "¿Sustancia blanca y dulce que recubre las semillas?", a: ["Resina", "Mucílago", "Látex", "Néctar"], correct: 1 }, { q: "¿Herramienta para cortar mazorcas altas sin dañar el cojinete?", a: ["Hacha", "Desjarretadora o media luna", "Motosierra", "Tijeras"], correct: 1 }, { q: "¿Cuánto tarda un árbol desde que se planta hasta su cosecha?", a: ["6 meses", "1 año", "De 3 a 5 años", "20 años"], correct: 2 }],
    preparacion: [{ q: "¿Proceso de amasar y calentar para suavizar la textura?", a: ["Filtrado", "Conchado", "Centrifugado", "Prensado"], correct: 1 }, { q: "¿Ingrediente usado en cosméticos y chocolate blanco?", a: ["Licor de cacao", "Manteca de cacao", "Mucílago", "Cascarilla"], correct: 1 }, { q: "¿Qué ingrediente NO debería tener un chocolate oscuro?", a: ["Pasta de cacao", "Manteca de cacao", "Leche", "Azúcar"], correct: 2 }, { q: "¿Temperatura aproximada del tostado?", a: ["50°C - 60°C", "110°C - 140°C", "300°C", "0°C"], correct: 1 }, { q: "¿Trozos pequeños de grano tostado listos para moler?", a: ["Chips", "Nibs", "Gránulos", "Pepitas"], correct: 1 }, { q: "¿Para qué sirve el Temperado?", a: ["Sabor amargo", "Brillo y quiebre limpio", "Eliminar bacterias", "Aumentar volumen"], correct: 1 }, { q: "¿Diferencia principal entre chocolate con leche y blanco?", a: ["El azúcar", "El licor o pasta de cacao", "La vainilla", "La lecitina"], correct: 1 }],
    economia: [{ q: "¿País que lidera la producción mundial?", a: ["Suiza", "Costa de Marfil", "Brasil", "Bélgica"], correct: 1 }, { q: "¿Puerto histórico de Venezuela famoso por el cacao fino?", a: ["Puerto Cabello", "Maracaibo", "La Romana", "Cartagena"], correct: 0 }, { q: "¿Variedad de cacao más escasa y apreciada?", a: ["Forastero", "Trinitario", "Criollo", "CCN-51"], correct: 2 }, { q: "¿Región con más del 60% de producción global?", a: ["América Latina", "África Occidental", "Sudeste Asiático", "Europa"], correct: 1 }, { q: "¿Dónde se negocia el precio internacional del cacao?", a: ["Londres y Nueva York", "París y Roma", "Tokio", "Madrid"], correct: 0 }, { q: "¿Amenaza biológica que destruye plantaciones?", a: ["Falta de sol", "Hongos (Escoba de Bruja/Monilia)", "Abejas", "Viento"], correct: 1 }, { q: "¿País que consume más chocolate por persona?", a: ["Suiza", "Ecuador", "China", "Ghana"], correct: 0 }],
    curiosidades: [{ q: "¿Cuál NO es un producto derivado del cacao?", a: ["Cocoa en polvo", "Nibs", "Aceite de canola", "Licor de cacao"], correct: 2 }, { q: "¿Civilización que usaba el cacao como moneda?", a: ["Incas", "Mayas y Aztecas", "Egipcios", "Griegos"], correct: 1 }, { q: "¿Porcentaje de grasa natural del grano seco?", a: ["10%", "25%", "50%", "85%"], correct: 2 }, { q: "¿Compuesto que genera bienestar y felicidad?", a: ["Cafeína", "Teobromina", "Vitamina K", "Sodio"], correct: 1 }, { q: "¿Uso NO alimentario del cacao?", a: ["Neumáticos", "Cremas hidratantes y labiales", "Aviones", "Acero"], correct: 1 }, { q: "¿Qué se hace con la cáscara de la mazorca?", a: ["Se tira al mar", "Abono orgánico o alimento de ganado", "Papel moneda", "Es tóxica"], correct: 1 }, { q: "¿Bebida ancestral mexicana (cacao, maíz y especias)?", a: ["Pisco", "Tejate o Pozol", "Mate", "Chicha"], correct: 1 }]
}; 

// --- GESTIÓN DE NIVELES ---
function ocultarTodo() { 
    const ids = ['level-sort-container', 'level-trivia-container', 'category-selection', 'question-display', 'transition-overlay', 'level-intro', 'gameControls'];
    ids.forEach(id => { const el = document.getElementById(id); if(el) el.classList.add('hidden'); });
    gameControls.classList.add('hidden');
} 

function iniciarNivel(num) { 
    ocultarTodo(); 
    currentLevel = num; gameActive = false; score = 0; obstacles = []; cacaos = []; 
    player.x = 80; player.dy = 0; player.y = 0; 
    
    if(num === 1) { 
        scoreValue.innerText = "0 / 10"; levelIndicator.innerText = "NIVEL 1: LA COSECHA"; 
        if(!introMostradaEnEsteNivel) showIntro("NIVEL 1", "Recoge 10 cacaos."); else { gameActive = true; gameControls.classList.remove('hidden'); }
    } else if(num === 2) { 
        levelIndicator.innerText = "NIVEL 2: EL PROCESO";
        if(!introMostradaEnEsteNivel) showIntro("NIVEL 2", "Ordena el proceso."); else { initLevel2Sort(); gameControls.classList.remove('hidden'); }
    } else if(num === 3) { 
        levelIndicator.innerText = "NIVEL 3: EL ENVÍO"; scoreValue.innerText = "0 / 2000"; 
        if(!introMostradaEnEsteNivel) showIntro("NIVEL 3", "¡Esquiva los troncos!"); else { gameActive = true; gameControls.classList.remove('hidden'); }
    } else if(num === 4) { 
        levelIndicator.innerText = "NIVEL 4: SABIDURÍA";
        if(!introMostradaEnEsteNivel) showIntro("NIVEL 4", "¡Aprende sobre el Cacao!"); else {
            document.getElementById('level-trivia-container').classList.remove('hidden');
            document.getElementById('category-selection').classList.remove('hidden');
            gameControls.classList.remove('hidden');
        }
    } 
} 

function showIntro(title, desc) { 
    introMostradaEnEsteNivel = true; levelIntro.classList.remove('hidden');
    document.getElementById('intro-title').innerText = title; document.getElementById('intro-desc').innerText = desc; 
    hablar(title + ". " + desc); 
    setTimeout(() => { 
        levelIntro.classList.add('hidden'); gameControls.classList.remove('hidden');
        if(currentLevel === 1 || currentLevel === 3) gameActive = true; 
        if(currentLevel === 2) initLevel2Sort(); 
        if(currentLevel === 4) { 
            document.getElementById('level-trivia-container').classList.remove('hidden'); 
            document.getElementById('category-selection').classList.remove('hidden'); 
        }
    }, 4000); 
} 

function volverInicio() { introMostradaEnEsteNivel = false; iniciarNivel(1); }
function reiniciarNivelActual() { introMostradaEnEsteNivel = true; iniciarNivel(currentLevel); }
function salirJuego() { if(confirm("¿Quieres volver a empezar?")) window.location.reload(); }

function morir() { 
    gameActive = false; 
    playSnd('snd-hit'); 
    hablar("¡Oh no!"); 
    canvas.classList.add('shake'); 
    setTimeout(() => { canvas.classList.remove('shake'); reiniciarNivelActual(); }, 500); 
}

function saltar() { if(player.grounded && (gameActive || currentLevel === 2 || currentLevel === 4)) { player.dy = -player.jumpForce; player.grounded = false; } } 
document.getElementById('jumpAreaInvisible').onclick = saltar; 

// --- LÓGICA NIVEL 2 ---
function initLevel2Sort() { 
    document.getElementById('level-sort-container').classList.remove('hidden');
    const container = document.getElementById('options-container'); const target = document.getElementById('target-slot'); const feedback = document.getElementById('feedback-l2'); 
    container.innerHTML = ''; target.innerText = "Toca los pasos abajo..."; feedback.innerText = "";
    let stepIdx = 0; let randomizedSteps = [...steps].sort(() => Math.random() - 0.5); 
    randomizedSteps.forEach(s => { 
        const b = document.createElement('button'); b.className = 'step-card'; b.innerText = s.text; 
        b.onclick = () => { 
            if(s.id === steps[stepIdx].id) { 
                playSnd('snd-success');
                target.innerText = steps[stepIdx].text; 
                feedback.innerText = "✅ ¡CORRECTO!"; 
                feedback.style.setProperty('color', '#008000', 'important'); 
                hablar("Bien"); b.remove(); stepIdx++; 
                if(stepIdx === steps.length) {
                    playSnd('snd-win');
                    feedback.innerHTML = `<button class="step-card" style="background:green; color:white; width:100%" onclick="introMostradaEnEsteNivel=false; iniciarNivel(3)">¡LOGRADO! IR AL NIVEL 3</button>`; 
                }
            } else { 
                playSnd('snd-hit');
                feedback.innerText = "❌ ESE NO ES EL ORDEN"; 
                feedback.style.setProperty('color', '#FF0000', 'important'); 
                hablar("No"); 
            } 
        }; container.appendChild(b); 
    }); 
} 

// --- LÓGICA NIVEL 4 ---
function startTrivia(cat) { 
    document.getElementById('category-selection').classList.add('hidden'); document.getElementById('question-display').classList.remove('hidden'); 
    const qList = [...triviaData[cat]].sort(() => Math.random() - 0.5); 
    let tIdx = 0; let trScore = 0; const feed = document.getElementById('trivia-feedback'); 
    feed.innerText = "Puntos: 0"; feed.style.color = "#4e2c1c";
    const renderQ = () => { 
        const qData = qList[tIdx]; document.getElementById('question-text').innerText = qData.q; hablar(qData.q); 
        const optDiv = document.getElementById('trivia-options'); optDiv.innerHTML = ''; 
        qData.a.map((text, index) => ({ text, isCorrect: index === qData.correct })).sort(() => Math.random() - 0.5).forEach((opt) => { 
            const b = document.createElement('button'); b.className = 'step-card'; b.innerText = opt.text; 
            b.onclick = () => { 
                if (opt.isCorrect) { 
                    playSnd('snd-success');
                    trScore += 100; feed.innerText = `✅ +100 PTS (Total: ${trScore})`; 
                    feed.style.setProperty('color', '#008000', 'important'); 
                    hablar("Correcto"); 
                    Array.from(optDiv.children).forEach(btn => btn.disabled = true);
                    setTimeout(() => { 
                        tIdx++; 
                        if (tIdx < qList.length) { feed.style.color = "#4e2c1c"; renderQ(); } 
                        else { 
                            playSnd('snd-win');
                            feed.innerHTML = `🎉 CATEGORÍA COMPLETADA!`; 
                            feed.style.setProperty('color', '#008000', 'important');
                            setTimeout(() => { 
                                document.getElementById('category-selection').classList.remove('hidden'); 
                                document.getElementById('question-display').classList.add('hidden'); 
                            }, 2000); 
                        } 
                    }, 1500); 
                } 
                else { 
                    playSnd('snd-hit');
                    feed.innerText = `❌ INTENTA OTRA VEZ`; 
                    feed.style.setProperty('color', '#FF0000', 'important'); 
                    hablar("Error"); 
                } 
            }; optDiv.appendChild(b); 
        }); 
    }; renderQ(); 
} 

// --- BUCLE PRINCIPAL ---
function update() { 
    if(!gameActive) return; 
    if(keys.ArrowRight) player.dx = player.speed; else if(keys.ArrowLeft) player.dx = -player.speed; else player.dx = 0;  
    player.x += player.dx; player.dy += gravity; player.y += player.dy; 
    if(player.y + player.height > canvas.height - 40) { player.y = canvas.height - 40 - player.height; player.dy = 0; player.grounded = true; } 
    if(player.x < 0) player.x = 0; if(player.x + player.width > canvas.width) player.x = canvas.width - player.width; 
    let vel = (currentLevel === 3) ? 13 : 8; 
    
    obstacles.forEach(o => { 
        o.x -= vel; 
        if(player.x < o.x + 45 && player.x + player.width > o.x && player.y < o.y + 55 && player.y + player.height > o.y) morir(); 
    }); 

    if(currentLevel === 1) { 
        cacaos.forEach((c, i) => { 
            c.x -= vel; 
            if(player.x < c.x + 40 && player.x + player.width > c.x && player.y < c.y + 50 && player.y + player.height > c.y) { 
                cacaos.splice(i, 1); score++; playSnd('snd-collect');
                document.getElementById('game-ui').style.transform = "scale(1.2)";
                setTimeout(() => document.getElementById('game-ui').style.transform = "scale(1)", 100);
                scoreValue.innerText = `${score} / 10`; 
                if(score >= 10) { gameActive = false; playSnd('snd-win'); transitionOverlay.classList.remove('hidden'); } 
            } 
        }); 
        if(Math.random() < 0.02) cacaos.push({ x: canvas.width, y: canvas.height - 180 }); 
    } else if(currentLevel === 3) { 
        score += 5; scoreValue.innerText = `${score} / 2000`; 
        if(score >= 2000) { gameActive = false; playSnd('snd-win'); introMostradaEnEsteNivel = false; iniciarNivel(4); } 
    } 
    if(Math.random() < 0.025) obstacles.push({ x: canvas.width, y: canvas.height - 95 }); 
    obstacles = obstacles.filter(o => o.x > -100); 
} 

function draw() { 
    ctx.clearRect(0,0, canvas.width, canvas.height); 
    ctx.fillStyle = (currentLevel === 3) ? '#444' : '#5d4037'; ctx.fillRect(0, canvas.height - 40, canvas.width, 40); 
    cacaos.forEach(c => { if(cacaoImgReady) ctx.drawImage(imgCacao, c.x, c.y, 45, 55); else { ctx.fillStyle = '#ffcc00'; ctx.fillRect(c.x, c.y, 40, 50); } }); 
    ctx.fillStyle = '#2d1a11'; obstacles.forEach(o => ctx.fillRect(o.x, o.y, 55, 65)); 
    if(playerImgReady) ctx.drawImage(imgPlayer, player.x, player.y, player.width, player.height); else { ctx.fillStyle = 'white'; ctx.fillRect(player.x, player.y, player.width, player.height); }
} 

window.addEventListener('keydown', e => { if(keys.hasOwnProperty(e.key)) keys[e.key] = true; if(e.key === ' ') saltar(); });
window.addEventListener('keyup', e => { if(keys.hasOwnProperty(e.key)) keys[e.key] = false; });
document.getElementById('btn-next-level').onclick = () => { introMostradaEnEsteNivel = false; iniciarNivel(2); }; 

iniciarNivel(1); 
function loop() { update(); draw(); requestAnimationFrame(loop); } 
loop();