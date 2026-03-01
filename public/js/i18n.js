/* ========================================
   Gazi DOTT — i18n (Internationalization)
   Turkish (default) & English
   ======================================== */

const translations = {
    tr: {
        // Navbar
        "nav.home": "Ana Sayfa",
        "nav.events": "Etkinlikler",
        "nav.gamejams": "Game Jam'ler",
        "nav.about": "Hakkımızda",
        "nav.contact": "İletişim",
        "nav.joinCommunity": "Topluluğa Katıl",

        // Home page
        "home.hero.badge": "Kayıtlar Açık",
        "home.hero.title": "Dijital Oyun Tasarım",
        "home.hero.subtitle": "Topluluğu",
        "home.hero.description": "Gazi Üniversitesi Dijital Oyun Tasarım Topluluğu olarak oyun geliştirme, game jam'ler ve atölye çalışmalarıyla yaratıcılığınızı keşfedin!",
        "home.hero.cta": "Etkinliklere Göz At",
        "home.hero.cta2": "Hakkımızda",
        "home.featuredJam": "Öne Çıkan Game Jam",
        "home.upcomingWorkshops": "Yaklaşan Atölyeler",
        "home.upcomingEvents": "Yaklaşan Etkinlikler",
        "home.viewAll": "Tümünü Gör",
        "home.pastEvents": "Geçmiş Etkinlikler",
        "home.whyJoin": "Neden DOTT?",
        "home.whyJoin.desc": "Oyun geliştirme tutkunu öğrencilerle tanış, yeteneklerini geliştir ve projelerini hayata geçir.",
        "home.reason.community": "Topluluk",
        "home.reason.communityDesc": "Aynı tutkuyu paylaşan öğrencilerle bir araya gel.",
        "home.reason.learn": "Öğren",
        "home.reason.learnDesc": "Atölye ve workshop'larla yeni beceriler kazan.",
        "home.reason.create": "Yarat",
        "home.reason.createDesc": "Game jam'lerde fikirlerini oyunlara dönüştür.",

        // Events page
        "events.title": "Etkinlikler",
        "events.subtitle": "Tüm atölye çalışmaları, buluşmalar ve etkinliklerimiz.",
        "events.filter.all": "Tümü",
        "events.filter.workshop": "Atölyeler",
        "events.filter.gamejam": "Game Jam",
        "events.filter.social": "Sosyal",
        "events.filter.technical": "Teknik",
        "events.noEvents": "Henüz planlanmış etkinlik yok.",
        "events.details": "Detaylar",
        "events.past": "Geçmiş Etkinlikler",

        // Game Jams page
        "gamejams.title": "Game Jam'ler",
        "gamejams.subtitle": "48 saat, sonsuz yaratıcılık. Oyun geliştirme maratonlarımıza katıl!",
        "gamejams.nextJam": "Sonraki Game Jam",
        "gamejams.register": "Kayıt Ol",
        "gamejams.learnMore": "Detaylı Bilgi",
        "gamejams.pastJams": "Geçmiş Game Jam'ler",
        "gamejams.days": "Gün",
        "gamejams.hours": "Saat",
        "gamejams.minutes": "Dakika",
        "gamejams.seconds": "Saniye",
        "gamejams.noJams": "Henüz planlanmış game jam yok.",

        // About page
        "about.title": "Hakkımızda",
        "about.subtitle": "Gazi Üniversitesi Dijital Oyun Tasarım Topluluğu",
        "about.mission.title": "Misyonumuz",
        "about.mission.desc": "Oyun tasarımı ve geliştirme alanında öğrencilerin yeteneklerini geliştirmek, sektörel etkileşimleri artırmak ve yaratıcı projelere öncülük etmek.",
        "about.whatWeDo": "Neler Yapıyoruz?",
        "about.do.design": "Oyun Tasarımı",
        "about.do.designDesc": "Konsept tasarımdan son ürüne kadar oyun geliştirme sürecini öğreniyoruz.",
        "about.do.jams": "Game Jam'ler",
        "about.do.jamsDesc": "Düzenli olarak game jam'ler düzenliyor ve katılıyoruz.",
        "about.do.workshops": "Atölyeler",
        "about.do.workshopsDesc": "Unity, Unreal Engine, Blender ve daha fazlası hakkında eğitimler veriyoruz.",
        "about.do.community": "Topluluk",
        "about.do.communityDesc": "Sektör profesyonelleri ve diğer topluluklarla buluşmalar düzenliyoruz.",
        "about.team": "Yönetim Kadromuz",
        "about.team.president": "Başkan",
        "about.team.vicePresident": "Başkan Yardımcısı",
        "about.team.coordinator": "Koordinatör",

        // Contact page
        "contact.title": "İletişim",
        "contact.subtitle": "Bize ulaşmak için aşağıdaki kanalları kullanabilirsiniz.",
        "contact.email": "E-posta",
        "contact.discord": "Discord",
        "contact.linkedin": "LinkedIn",
        "contact.instagram": "Instagram",
        "contact.twitter": "Twitter / X",
        "contact.sendMessage": "Mesaj Gönder",
        "contact.name": "Adınız",
        "contact.emailInput": "E-posta Adresiniz",
        "contact.message": "Mesajınız",
        "contact.send": "Gönder",
        "contact.followUs": "Bizi Takip Edin",

        // Admin
        "admin.title": "Yönetim Paneli",
        "admin.login": "Giriş Yap",
        "admin.password": "Şifre",
        "admin.passwordPlaceholder": "Yönetici şifresini girin",
        "admin.wrongPassword": "Yanlış şifre!",
        "admin.tabEvents": "Etkinlikler",
        "admin.tabTeam": "Ekip Yönetimi",
        "admin.createEvent": "Yeni Etkinlik Oluştur",
        "admin.editEvent": "Etkinliği Düzenle",
        "admin.eventTitle": "Etkinlik Başlığı",
        "admin.eventTitleTr": "Başlık (Türkçe)",
        "admin.eventTitleEn": "Başlık (İngilizce)",
        "admin.eventDescTr": "Açıklama (Türkçe)",
        "admin.eventDescEn": "Açıklama (İngilizce)",
        "admin.eventDate": "Tarih",
        "admin.eventTime": "Saat",
        "admin.eventCategory": "Kategori",
        "admin.eventLocation": "Konum",
        "admin.eventImage": "Etkinlik Görseli",
        "admin.eventImageUrl": "Görsel URL",
        "admin.eventImageUpload": "veya dosya yükle",
        "admin.eventImageDrop": "Görseli buraya sürükleyin veya tıklayın",
        "admin.eventLink": "Etkinlik Linki (opsiyonel)",
        "admin.save": "Kaydet",
        "admin.update": "Güncelle",
        "admin.cancel": "İptal",
        "admin.delete": "Sil",
        "admin.edit": "Düzenle",
        "admin.export": "JSON Dışa Aktar",
        "admin.existingEvents": "Mevcut Etkinlikler",
        "admin.upcomingEvents": "Yaklaşan Etkinlikler",
        "admin.pastEvents": "Geçmiş Etkinlikler",
        "admin.noEvents": "Henüz etkinlik oluşturulmadı.",
        "admin.eventSaved": "Etkinlik kaydedildi!",
        "admin.eventUpdated": "Etkinlik güncellendi!",
        "admin.eventDeleted": "Etkinlik silindi!",
        "admin.deletePastEvents": "Geçmiş Etkinlikleri Temizle",
        "admin.logout": "Çıkış Yap",
        "admin.importJson": "JSON İçe Aktar",
        // Admin - Team
        "admin.addMember": "Yeni Üye Ekle",
        "admin.editMember": "Üyeyi Düzenle",
        "admin.memberName": "Ad Soyad",
        "admin.memberRoleTr": "Görev (Türkçe)",
        "admin.memberRoleEn": "Görev (İngilizce)",
        "admin.memberPhoto": "Fotoğraf",
        "admin.noMembers": "Henüz ekip üyesi eklenmedi.",
        "admin.memberSaved": "Ekip üyesi kaydedildi!",
        "admin.memberUpdated": "Ekip üyesi güncellendi!",
        "admin.memberDeleted": "Ekip üyesi silindi!",
        "admin.existingMembers": "Ekip Üyeleri",
        "admin.imageSizeWarning": "Görsel 500KB'den büyük — yükleme süresi uzayabilir.",
        // Admin - Categories
        "admin.tabCategories": "Kategoriler",
        "admin.createCategory": "Yeni Kategori Oluştur",
        "admin.editCategory": "Kategoriyi Düzenle",
        "admin.categoryNameTr": "Kategori Adı (Türkçe)",
        "admin.categoryNameEn": "Kategori Adı (İngilizce)",
        "admin.categoryIcon": "İkon (Material Symbols)",
        "admin.categoryColor": "Renk",
        "admin.categorySaved": "Kategori kaydedildi!",
        "admin.categoryUpdated": "Kategori güncellendi!",
        "admin.categoryDeleted": "Kategori silindi!",
        "admin.noCategories": "Henüz kategori oluşturulmadı.",
        "admin.existingCategories": "Mevcut Kategoriler",

        // Footer
        "footer.codeOfConduct": "Biz kimiz?",
        "footer.contactUs": "Bize Ulaşın",
        "footer.copyright": "© 2025 Gazi DOTT — Dijital Oyun Tasarım Topluluğu.",

        // Common
        "common.loading": "Yükleniyor...",
    },

    en: {
        // Navbar
        "nav.home": "Home",
        "nav.events": "Events",
        "nav.gamejams": "Game Jams",
        "nav.about": "About",
        "nav.contact": "Contact",
        "nav.joinCommunity": "Join Community",

        // Home page
        "home.hero.badge": "Registration Open",
        "home.hero.title": "Digital Game Design",
        "home.hero.subtitle": "Club",
        "home.hero.description": "Discover your creativity through game development, game jams, and workshops with the Gazi University Digital Game Design Community!",
        "home.hero.cta": "Browse Events",
        "home.hero.cta2": "About Us",
        "home.featuredJam": "Featured Game Jam",
        "home.upcomingWorkshops": "Upcoming Workshops",
        "home.upcomingEvents": "Upcoming Events",
        "home.viewAll": "View All",
        "home.pastEvents": "Past Events",
        "home.whyJoin": "Why DOTT?",
        "home.whyJoin.desc": "Meet students who share your passion for game development, improve your skills, and bring your projects to life.",
        "home.reason.community": "Community",
        "home.reason.communityDesc": "Connect with students who share your passion.",
        "home.reason.learn": "Learn",
        "home.reason.learnDesc": "Gain new skills through workshops and training.",
        "home.reason.create": "Create",
        "home.reason.createDesc": "Turn your ideas into games at game jams.",

        // Events page
        "events.title": "Events",
        "events.subtitle": "All workshops, meetups, and events.",
        "events.filter.all": "All",
        "events.filter.workshop": "Workshops",
        "events.filter.gamejam": "Game Jam",
        "events.filter.social": "Social",
        "events.filter.technical": "Technical",
        "events.noEvents": "No events planned yet.",
        "events.details": "Details",
        "events.past": "Past Events",

        // Game Jams page
        "gamejams.title": "Game Jams",
        "gamejams.subtitle": "48 hours, infinite creativity. Join our game development marathons!",
        "gamejams.nextJam": "Next Game Jam",
        "gamejams.register": "Register",
        "gamejams.learnMore": "Learn More",
        "gamejams.pastJams": "Past Game Jams",
        "gamejams.days": "Days",
        "gamejams.hours": "Hours",
        "gamejams.minutes": "Minutes",
        "gamejams.seconds": "Seconds",
        "gamejams.noJams": "No game jams planned yet.",

        // About page
        "about.title": "About Us",
        "about.subtitle": "Gazi University Digital Game Design Community",
        "about.mission.title": "Our Mission",
        "about.mission.desc": "To develop students' talents in game design and development, enhance industry interactions, and lead creative projects.",
        "about.whatWeDo": "What We Do",
        "about.do.design": "Game Design",
        "about.do.designDesc": "We learn the game development process from concept to final product.",
        "about.do.jams": "Game Jams",
        "about.do.jamsDesc": "We regularly organize and participate in game jams.",
        "about.do.workshops": "Workshops",
        "about.do.workshopsDesc": "We provide training on Unity, Unreal Engine, Blender, and more.",
        "about.do.community": "Community",
        "about.do.communityDesc": "We organize meetups with industry professionals and other communities.",
        "about.team": "Our Team",
        "about.team.president": "President",
        "about.team.vicePresident": "Vice President",
        "about.team.coordinator": "Coordinator",

        // Contact page
        "contact.title": "Contact",
        "contact.subtitle": "You can reach us through the channels below.",
        "contact.email": "Email",
        "contact.discord": "Discord",
        "contact.linkedin": "LinkedIn",
        "contact.instagram": "Instagram",
        "contact.twitter": "Twitter / X",
        "contact.sendMessage": "Send Message",
        "contact.name": "Your Name",
        "contact.emailInput": "Your Email",
        "contact.message": "Your Message",
        "contact.send": "Send",
        "contact.followUs": "Follow Us",

        // Admin
        "admin.title": "Admin Panel",
        "admin.login": "Login",
        "admin.password": "Password",
        "admin.passwordPlaceholder": "Enter admin password",
        "admin.wrongPassword": "Wrong password!",
        "admin.tabEvents": "Events",
        "admin.tabTeam": "Team Management",
        "admin.createEvent": "Create New Event",
        "admin.editEvent": "Edit Event",
        "admin.eventTitle": "Event Title",
        "admin.eventTitleTr": "Title (Turkish)",
        "admin.eventTitleEn": "Title (English)",
        "admin.eventDescTr": "Description (Turkish)",
        "admin.eventDescEn": "Description (English)",
        "admin.eventDate": "Date",
        "admin.eventTime": "Time",
        "admin.eventCategory": "Category",
        "admin.eventLocation": "Location",
        "admin.eventImage": "Event Image",
        "admin.eventImageUrl": "Image URL",
        "admin.eventImageUpload": "or upload file",
        "admin.eventImageDrop": "Drag & drop image here or click",
        "admin.eventLink": "Event Link (optional)",
        "admin.save": "Save",
        "admin.update": "Update",
        "admin.cancel": "Cancel",
        "admin.delete": "Delete",
        "admin.edit": "Edit",
        "admin.export": "Export JSON",
        "admin.existingEvents": "Existing Events",
        "admin.upcomingEvents": "Upcoming Events",
        "admin.pastEvents": "Past Events",
        "admin.noEvents": "No events created yet.",
        "admin.eventSaved": "Event saved!",
        "admin.eventUpdated": "Event updated!",
        "admin.eventDeleted": "Event deleted!",
        "admin.deletePastEvents": "Clear Past Events",
        "admin.logout": "Logout",
        "admin.importJson": "Import JSON",
        // Admin - Team
        "admin.addMember": "Add New Member",
        "admin.editMember": "Edit Member",
        "admin.memberName": "Full Name",
        "admin.memberRoleTr": "Role (Turkish)",
        "admin.memberRoleEn": "Role (English)",
        "admin.memberPhoto": "Photo",
        "admin.noMembers": "No team members added yet.",
        "admin.memberSaved": "Team member saved!",
        "admin.memberUpdated": "Team member updated!",
        "admin.memberDeleted": "Team member deleted!",
        "admin.existingMembers": "Team Members",
        "admin.imageSizeWarning": "Image is larger than 500KB — loading may be slow.",
        // Admin - Categories
        "admin.tabCategories": "Categories",
        "admin.createCategory": "Create New Category",
        "admin.editCategory": "Edit Category",
        "admin.categoryNameTr": "Category Name (Turkish)",
        "admin.categoryNameEn": "Category Name (English)",
        "admin.categoryIcon": "Icon (Material Symbols)",
        "admin.categoryColor": "Color",
        "admin.categorySaved": "Category saved!",
        "admin.categoryUpdated": "Category updated!",
        "admin.categoryDeleted": "Category deleted!",
        "admin.noCategories": "No categories created yet.",
        "admin.existingCategories": "Existing Categories",

        // Footer
        "footer.codeOfConduct": "Code of Conduct",
        "footer.contactUs": "Contact Us",
        "footer.copyright": "© 2025 Gazi DOTT — Digital Game Design Community.",

        // Common
        "common.loading": "Loading...",
    }
};

// Current language
let currentLang = localStorage.getItem('dott-lang') || 'tr';

/**
 * Get a translation by key
 */
function t(key) {
    return translations[currentLang]?.[key] || translations['tr']?.[key] || key;
}

/**
 * Set language and update all elements with data-i18n attribute
 */
function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('dott-lang', lang);
    updatePageTranslations();
    updateLangSwitcher();
}

/**
 * Update all elements that have data-i18n attribute
 */
function updatePageTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = t(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = translation;
        } else {
            el.textContent = translation;
        }
    });

    // Update data-i18n-html for elements needing innerHTML
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        el.innerHTML = t(key);
    });
}

/**
 * Update language switcher button states
 */
function updateLangSwitcher() {
    document.querySelectorAll('.lang-switch button').forEach(btn => {
        const lang = btn.getAttribute('data-lang');
        if (lang === currentLang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

/**
 * Initialize i18n on page load
 */
function initI18n() {
    updatePageTranslations();
    updateLangSwitcher();

    // Bind language switcher clicks
    document.querySelectorAll('.lang-switch button').forEach(btn => {
        btn.addEventListener('click', async () => {
            setLanguage(btn.getAttribute('data-lang'));
            // Re-render dynamic content if available (await to prevent race conditions)
            if (typeof renderEvents === 'function') await renderEvents();
            if (typeof renderGameJams === 'function') await renderGameJams();
            if (typeof renderAdminEvents === 'function') await renderAdminEvents();
            if (typeof renderTeamMembers === 'function') await renderTeamMembers();
            if (typeof renderAdminTeam === 'function') await renderAdminTeam();
        });
    });
}
