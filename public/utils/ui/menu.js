export function renderMenu(canvas) {
    let menuContainer = document.getElementById('a');
    menuContainer = document.createElement('div');
    menuContainer.id = 'a'; // soy demaciado haragan para cambiar el id del div
    Object.assign(menuContainer.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'sans-serif',
        zIndex: '9999',
        color: '#ffffff'
    });

    // 4. Crear el título
    const title = document.createElement('h1');
    title.innerText = 'MI JUEGO WEBGL';
    title.style.marginBottom = '40px';
    title.style.fontSize = '3rem';
    menuContainer.appendChild(title);

    // 5. Crear los botones
    const botones = ['JUGAR', 'OPCIONES', 'SALIR'];
    botones.forEach(texto => {
        const btn = document.createElement('button');
        btn.innerText = texto;
        
        // Estilos básicos y efectos visuales
        Object.assign(btn.style, {
            width: '200px',
            padding: '15px',
            margin: '10px',
            fontSize: '1.2rem',
            cursor: 'pointer',
            color: '#fff',
            border: '2px solid #fff',
            borderRadius: '5px',
            transition: 'all 0.2s'
        });

        // Efectos Hover con JS
        btn.onmouseenter = () => { btn.style.backgroundColor = '#fff'; btn.style.color = '#111'; };
        btn.onmouseleave = () => { btn.style.backgroundColor = '#222'; btn.style.color = '#fff'; };

        // Acción al hacer clic
        btn.onclick = () => {
            if (texto === 'JUGAR') {
                // Ocultar el menú y volver a mostrar el Canvas de WebGL
                menuContainer.style.display = 'none';
                if (canvas) canvas.style.display = 'block';
                
                // Aquí inicias tu loop de renderizado de WebGL si estaba pausado
                console.log('Iniciando juego WebGL...');
            } else {
                console.log(`Clic en: ${texto}`);
            }
        };

        menuContainer.appendChild(btn);
    });

    // 6. Inyectar el menú en el documento
    document.body.appendChild(menuContainer);
  };
