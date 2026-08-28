export function pauseMenu(canvas) {
    let menuContainer = document.getElementById('pausecontainer');
    menuContainer = document.createElement('div');
    menuContainer.id = 'pauseMenu';

    const title = document.createElement('h1');
    title.innerText = 'Pausa';
    title.id = "pause-title"
    menuContainer.appendChild(title);

    const botones = ['CONTINUAR', 'COMO JUGAR'];
    botones.forEach(texto => {
        const btn = document.createElement('button');
        btn.innerText = texto;
        btn.id = "pausebtn";

        btn.onclick = () => {
            if (texto === 'CONTINUAR') {
                // Ocultar el menú y volver a mostrar el Canvas de WebGL
                menuContainer.style.display = 'none';
                if (canvas) canvas.style.display = 'block';
                
                canvas.click();
            } else {
                console.log(`Clic en: ${texto}`);
            }
        };

        menuContainer.appendChild(btn);
    });

    document.body.appendChild(menuContainer);
  };
