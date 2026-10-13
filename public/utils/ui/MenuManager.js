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
    this.showMenu(this.mainContainer, "GREED", [
      {
        label: "JUGAR",
        action: () => {
          this.hideMain();
          onStart();
        },
      },
    ]);
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
