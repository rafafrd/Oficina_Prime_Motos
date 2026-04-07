// ========== DATA ==========
const pizzas = [
  {
    name: "Margherita",
    desc: "Molho de tomate San Marzano, mussarela de búfala, manjericão fresco",
    price: 39.9,
    category: "tradicional",
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&q=80"
  },
  {
    name: "Pepperoni",
    desc: "Pepperoni artesanal, mussarela derretida e molho de tomate caseiro",
    price: 44.9,
    category: "tradicional",
    image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&q=80"
  },
  {
    name: "Quatro Queijos",
    desc: "Mussarela, gorgonzola, parmesão e provolone com orégano",
    price: 49.9,
    category: "especial",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80"
  },
  {
    name: "Calabresa",
    desc: "Calabresa fatiada, cebola roxa caramelizada e azeitonas",
    price: 37.9,
    category: "tradicional",
    image: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=500&q=80"
  },
  {
    name: "Trufa Negra",
    desc: "Azeite trufado, cogumelos frescos, parmesão e rúcula",
    price: 59.9,
    category: "especial",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80"
  },
  {
    name: "Portuguesa",
    desc: "Presunto, ovos, cebola, azeitonas, ervilha e mussarela",
    price: 41.9,
    category: "tradicional",
    image: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=500&q=80"
  },
  {
    name: "Chocolate c/ Morango",
    desc: "Chocolate ao leite derretido com morangos frescos e açúcar",
    price: 36.9,
    category: "doce",
    image: "https://images.unsplash.com/photo-1586816001966-79b736744398?w=500&q=80"
  },
  {
    name: "Banana com Canela",
    desc: "Banana caramelizada, canela, leite condensado e mussarela",
    price: 34.9,
    category: "doce",
    image: "https://images.unsplash.com/photo-1575408213281-4569e07fad91?w=500&q=80"
  }
];

// ========== DOM ELEMENTS ==========
const menuGrid = document.getElementById("menuGrid");
const filterBtns = document.querySelectorAll(".filter-btn");
const navbar = document.getElementById("navbar");
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const contactForm = document.getElementById("contactForm");
const formFeedback = document.getElementById("formFeedback");

// ========== RENDER MENU ==========
function renderMenu(filter = "all") {
  const filtered =
    filter === "all" ? pizzas : pizzas.filter((p) => p.category === filter);

  menuGrid.innerHTML = "";

  filtered.forEach((pizza) => {
    const card = document.createElement("div");
    card.className = "pizza-card";
    card.innerHTML = `
      <div class="pizza-card-image" style="background-image: url('${pizza.image}')"></div>
      <div class="pizza-card-body">
        <h3>${pizza.name}</h3>
        <p>${pizza.desc}</p>
        <div class="pizza-card-footer">
          <span class="price">R$ ${pizza.price.toFixed(
            2
          ).replace(".", ",")}</span>
          <button class="add-btn" data-name="${pizza.name}">Pedir</button>
        </div>
      </div>
    `;
    menuGrid.appendChild(card);
  });

  // Attach add-to-cart animation
  document.querySelectorAll(".add-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.textContent = "Adicionado!";
      btn.style.background = "#27ae60";
      setTimeout(() => {
        btn.textContent = "Pedir";
        btn.style.background = "";
      }, 1500);
    });
  });
}

// ========== FILTER ==========
filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderMenu(btn.dataset.filter);
  });
});

// ========== NAVBAR SCROLL ==========
window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 50);
});

// ========== MOBILE MENU ==========
menuToggle.addEventListener("click", () => {
  menuToggle.classList.toggle("active");
  navLinks.classList.toggle("open");
});

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuToggle.classList.remove("active");
    navLinks.classList.remove("open");
  });
});

// ========== CONTACT FORM ==========
contactForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(contactForm);
  formFeedback.textContent = `Obrigado, ${data.get(
    "name"
  )}! Sua mensagem foi enviada, entraremos em contato em breve.`;
  contactForm.reset();
  setTimeout(() => (formFeedback.textContent = ""), 5000);
});

// ========== COUNTER ANIMATION ==========
const statNumbers = document.querySelectorAll(".stat-number");
let statsCounted = false;

function animateCounters() {
  statNumbers.forEach((el) => {
    const target = Number(el.dataset.target);
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;

    const counter = setInterval(() => {
      current += step;
      if (current >= target) {
        el.textContent = target + "+";
        clearInterval(counter);
      } else {
        el.textContent = Math.floor(current);
      }
    }, 16);
  });
}

// Intersection Observer for stats
const aboutSection = document.getElementById("sobre");
const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting && !statsCounted) {
      statsCounted = true;
      animateCounters();
    }
  },
  { threshold: 0.5 }
);

observer.observe(aboutSection);

// ========== INIT ==========
renderMenu();
