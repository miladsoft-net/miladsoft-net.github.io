export function portal(node: HTMLElement, target: string = 'body') {
  let targetEl: HTMLElement;

  function update(newTarget: string) {
    target = newTarget;
    targetEl = document.querySelector(target);
    if (targetEl) {
      targetEl.appendChild(node);
    }
  }

  function destroy() {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  update(target);

  return {
    update,
    destroy,
  };
}
