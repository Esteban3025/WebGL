const HELP_SECTIONS = [
  {
    title: "Movimiento",
    controls: [
      { keys: ["W", "S"], text: "Avanzar / retroceder hacia donde mirás" },
      { keys: ["A", "D"], text: "Moverte a la izquierda / derecha" },
      { keys: ["Shift"], text: "Mantener para moverte al doble de velocidad" },
      { keys: ["Mouse"], text: "Mirar alrededor (se captura al hacer clic o al jugar)" },
      { keys: ["Esc"], text: "Pausar y liberar el mouse" },
    ],
  },
  {
    title: "Luces",
    controls: [
      { keys: ["L"], text: "Encender / apagar toda la iluminación" },
      { keys: ["H"], text: "Mostrar / ocultar el cuadrado amarillo que marca la luz principal" },
      { keys: ["←", "→"], text: "Mover la luz principal a izquierda / derecha" },
      { keys: ["↑", "↓"], text: "Mover la luz principal hacia adelante / atrás" },
      { keys: ["Ctrl", "↑ ↓"], text: "Subir / bajar la luz principal" },
    ],
  },
  {
    title: "Objetos",
    controls: [
      { keys: ["P"], text: "Activar / desactivar el contorno del astronauta y del cubo de roca" },
    ],
  },
  {
    title: "Pantalla",
    controls: [
      { keys: ["K"], text: "Activar / desactivar el efecto sharpen (realce de nitidez)" },
      { keys: ["FPS"], text: "Cuadros por segundo, arriba a la izquierda" },
      { keys: ["Panel"], text: "Posición de la cámara, DeltaTime y posición de la luz, arriba a la derecha" },
    ],
  },
];

export class MenuManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.mainContainer = document.getElementById("menucontainer");
    this.pauseContainer = document.getElementById("pausecontainer");
    this.loadingContainer = document.getElementById("loadingcontainer");
    this.mainContainer.hidden = true;
    this.pauseContainer.hidden = true;
    this.loadingContainer.hidden = true;
  }

  showLoading(message) {
    this.loadingContainer.replaceChildren();
    const panel = document.createElement("div");
    panel.className = "menu-panel";
    const title = document.createElement("h1");
    title.textContent = "CARGANDO";
    const status = document.createElement("p");
    status.textContent = message;
    panel.append(title, status);
    this.loadingContainer.append(panel);
    this.loadingContainer.hidden = false;
  }

  updateLoading(message) {
    const status = this.loadingContainer.querySelector("p");
    if (status) status.textContent = message;
  }

  hideLoading() {
    this.loadingContainer.hidden = true;
  }

  showMain(onStart) {
    this.showMenu(this.mainContainer, "Nderakore!", [
      {
        label: "JUGAR",
        action: () => {
          this.hideMain();this.showMenu
          onStart();
        },
      },
      {
        label: "CONTROLES",
        action: () => this.showHelp(() => this.showMain(onStart)),
      },
    ]);
  }

  showHelp(onBack) {
    const container = this.mainContainer;
    container.replaceChildren();
    const panel = document.createElement("div");
    panel.className = "menu-panel help-panel";
    const title = document.createElement("h1");
    title.textContent = "CÓMO JUGAR";
    panel.append(title);

    for (const { title: sectionTitle, controls } of HELP_SECTIONS) {
      const section = document.createElement("section");
      section.className = "help-section";
      const heading = document.createElement("h2");
      heading.textContent = sectionTitle;
      section.append(heading);
      for (const { keys, text } of controls) {
        const row = document.createElement("div");
        row.className = "help-row";
        const keyCell = document.createElement("span");
        keyCell.className = "help-keys";
        for (const key of keys) {
          const cap = document.createElement("kbd");
          cap.textContent = key;
          keyCell.append(cap);
        }
        const description = document.createElement("span");
        description.textContent = text;
        row.append(keyCell, description);
        section.append(row);
      }
      panel.append(section);
    }

    const back = document.createElement("button");
    back.type = "button";
    back.textContent = "VOLVER";
    back.addEventListener("click", onBack);
    panel.append(back);
    container.append(panel);
    container.hidden = false;
  }

  hideMain() {
    this.mainContainer.hidden = true;
  }

  showPause(onResume) {
    this.showMenu(this.pauseContainer, "PAUSA", [
      {
        label: "CONTINUAR",
        action: () => {
          this.pauseContainer.hidden = true;
          onResume();
        },
      },
    ]);
  }

  showMenu(container, titleText, actions) {
    container.replaceChildren();
    const panel = document.createElement("div");
    panel.className = "menu-panel";
    const title = document.createElement("h1");
    title.textContent = titleText;
    panel.append(title);

    for (const { label, action } of actions) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", action);
      panel.append(button);
    }

    container.append(panel);
    container.hidden = false;
  }
}
