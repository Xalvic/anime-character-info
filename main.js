const container = document.getElementById("container");
const template = document.getElementById("card_template");
const skeletonTemplate = document.getElementById("skeleton_template");

const overlay = document.getElementById("modal-overlay");
const modalContent = document.getElementById("modal-content");
const modalImage = document.getElementById("modal-image");
const modalTitle = document.getElementById("modal-title");
const modalRole = document.getElementById("modal-role");

let isAnimeList = true;

let imageClone = "";
function openModalFromCard(cardEl, data) {
  // 1. Set modal content
  modalTitle.textContent = data.name;
  modalRole.textContent = data.role;

  // 2. Get card image position and size
  const rect = cardEl.getBoundingClientRect();
  modalContent.style.height = `${rect.height + 40}px`;
  const modalContentRect = modalContent.getBoundingClientRect();
  console.log(modalContentRect);

  // 3. Create a clone for transition
  imageClone = cardEl.cloneNode(true);
  imageClone.style.position = "fixed";
  imageClone.style.top = `${rect.top}px`;
  imageClone.style.left = `${rect.left}px`;
  //   imageClone.style.width = `${rect.width}px`;
  //   imageClone.style.height = `${rect.height}px`;
  imageClone.style.zIndex = 1000;
  imageClone.style.transition = "all 0.4s ease";
  document.body.appendChild(imageClone);

  // 4. Force reflow, then animate to modal position
  requestAnimationFrame(() => {
    imageClone.style.top = `${
      modalContentRect.top + modalContentRect.height / 2 - rect.height / 2
    }px`;
    imageClone.style.left = `${modalContentRect.left + 20}px`;
    // imageClone.style.transform = "translate(-50%, -50%)";
    imageClone.style.borderRadius = "12px";
  });

  // 5. After animation ends, show actual modal
  setTimeout(() => {
    overlay.classList.add("modal-visible");
    document.body.classList.add("modal-open");
    // imageClone.remove();
  }, 400);
}
overlay.addEventListener("click", () => {
  imageClone.remove();
  overlay.classList.remove("modal-visible");
  document.body.classList.remove("modal-open");
});

function showSkeletons(count) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const skeleton = skeletonTemplate.content.cloneNode(true);
    frag.appendChild(skeleton);
  }
  container.appendChild(frag);
}

function removeSkeletons() {
  document.querySelectorAll(".card.skeleton").forEach((el) => el.remove());
}

const createCardComponent = (title, image, body) => {
  const card = template.content.cloneNode(true).firstElementChild;
  const [cardImage, cardTitle, cardBody] = card.querySelectorAll(
    ".image, .title, .role"
  );
  cardTitle.textContent = title;
  //   cardBody.textContent = body;
  let imageTag = document.createElement("IMG");
  imageTag.src = image;
  imageTag.loading = "lazy";
  cardImage.appendChild(imageTag);
  return card;
};

let currentPage = 1;
let pageSize = 25;
let lastElement = null;
let charactersList = [];
let AnimeList = [];
let has_next_page = false;
const callAnimeList = async () => {
  showSkeletons(25);
  fetch(`https://api.jikan.moe/v4/top/anime?page=${currentPage}`)
    .then((res) => res.json())
    .then((data) => {
      charactersList = data.data;
      console.log(data.data);
      if (data.pagination) has_next_page = data.pagination.has_next_page;
      const page = charactersList;
      console.log(pageSize, currentPage);
      renderData(page);
      removeSkeletons();
    });
};
const callCharactersList = async (maId) => {
  showSkeletons(25);
  //NS:1735  DS:38000
  fetch(`https://api.jikan.moe/v4/anime/${maId}/characters`)
    .then((res) => res.json())
    .then((data) => {
      isAnimeList = false;
      charactersList = data.data;
      const page = paginate(charactersList, pageSize, currentPage);
      removeSkeletons();
      console.log(page);
      renderData(page);
    });
};

// callCharactersList();
const observeCallback = (entries, observer) => {
  if (entries[0].isIntersecting) {
    currentPage++;
    if (isAnimeList) {
      if (has_next_page) {
        observer.unobserve(lastElement);
        callAnimeList();
      }
    } else {
      if ((currentPage - 1) * pageSize < charactersList.length) {
        const page = paginate(charactersList, pageSize, currentPage);
        observer.unobserve(lastElement);
        renderData(page);
      } else {
        observer.disconnect();
      }
    }
  }
};
const observer = new IntersectionObserver(observeCallback, {
  threshold: 0.1,
});

const renderData = async (characters) => {
  const frag = document.createDocumentFragment();

  characters.forEach((item, index) => {
    const component = createCardComponent(
      item.character ? item.character.name : item.title,
      item.character
        ? item.character.images.webp.image_url
        : item.images.webp.large_image_url || item.images.webp.image_url,
      item.role
    );
    if (index == characters.length - 1) {
      lastElement = component;
      observer.observe(lastElement);
    }
    component.addEventListener("click", () => {
      if (isAnimeList) {
        animeId = item.mal_id;
        history.pushState({ animeId }, "", `/anime/${animeId}`);
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
        currentPage = 1;
        container.innerHTML = "";
        callCharactersList(animeId);
      } else
        openModalFromCard(component, {
          name: item.character ? item.character.name : item.title,
          image: item.character
            ? item.character.images.webp.image_url
            : item.images.webp.large_image_url || item.images.webp.image_url,
          role: item.role,
        });
    });
    frag.appendChild(component);
    // container.appendChild(component);
  });

  container.appendChild(frag);
};

function paginate(array, pageSize, pageNumber) {
  return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
}

window.addEventListener("popstate", (event) => {
  if (event.state?.animeId) {
    callCharactersList(event.state.animeId);
  } else {
    isAnimeList = true;
    container.innerHTML = "";
    callAnimeList();
  }
});
window.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  if (path.startsWith("/anime/")) {
    const animeId = path.split("/")[2];
    callCharactersList(animeId);
  } else {
    callAnimeList();
  }
});
