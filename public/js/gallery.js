let currentImages = [];
let currentImageIndex = 0;

function openGallery(imgElement, index) {
  const galleryGrid = imgElement.closest('.gallery-grid');
  currentImages = JSON.parse(galleryGrid.dataset.images);
  currentImageIndex = index;
  
  document.getElementById('galleryModal').style.display = 'block';
  document.getElementById('galleryImage').src = currentImages[currentImageIndex];
}

function closeGallery() {
  document.getElementById('galleryModal').style.display = 'none';
}

function changeImage(direction) {
  currentImageIndex += direction;
  if (currentImageIndex >= currentImages.length) currentImageIndex = 0;
  if (currentImageIndex < 0) currentImageIndex = currentImages.length - 1;
  document.getElementById('galleryImage').src = currentImages[currentImageIndex];
}

document.addEventListener('keydown', function(e) {
  if (document.getElementById('galleryModal').style.display === 'block') {
    if (e.key === 'Escape') closeGallery();
    if (e.key === 'ArrowLeft') changeImage(-1);
    if (e.key === 'ArrowRight') changeImage(1);
  }
});

// Close modal when clicking outside the image
document.getElementById('galleryModal').addEventListener('click', function(e) {
  if (e.target === this) {
    closeGallery();
  }
});

