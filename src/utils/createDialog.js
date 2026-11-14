// Shared lifecycle for native dialogs, including cancellable close while saving.
export default function createDialog(element) {
  const close = () => {
    if (!element.open) return;
    if (!element.dispatchEvent(new Event('dialog:beforeclose', { cancelable: true }))) return;
    element.close();
  };
  const onCancel = (event) => {
    event.preventDefault();
    close();
  };
  let backdropPressed = false;
  const outside = (event) => {
    const rect = element.getBoundingClientRect();
    return event.target === element && (event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom);
  };
  const onPointerDown = (event) => { backdropPressed = outside(event); };
  const onClick = (event) => {
    if (event.target.closest('[data-dialog-close]') || (backdropPressed && outside(event))) close();
    backdropPressed = false;
  };
  const onClose = () => {
    // Ignore a queued close event if StrictMode has already reopened the dialog.
    if (!element.open) element.dispatchEvent(new Event('dialog:closed'));
  };
  element.addEventListener('cancel', onCancel);
  element.addEventListener('close', onClose);
  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('click', onClick);
  return {
    showModal() {
      if (element.open) return;
      element.showModal();
      element.dispatchEvent(new Event('dialog:opened'));
    },
    close,
    dispose() {
      element.removeEventListener('cancel', onCancel);
      element.removeEventListener('close', onClose);
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('click', onClick);
      element.close();
    },
  };
}
