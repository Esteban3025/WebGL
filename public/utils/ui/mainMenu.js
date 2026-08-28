export function mainMenu(canvas) {
    let menuContainer = document.getElementById('menucontainer');
    menuContainer = document.createElement('div');
    menuContainer.id = 'menu'; // soy demaciado haragan para cambiar el id del div

    // 4. Crear el título
    const title = document.createElement('h1');
    title.innerText = 'Greed';
    title.id = "menu-title"
    menuContainer.appendChild(title);

    // 5. Crear los botones
    const botones = ['JUGAR', 'COMO JUGAR'];
    botones.forEach(texto => {
        const btn = document.createElement('button');
        btn.innerText = texto;
        btn.id = "menubtn";

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
