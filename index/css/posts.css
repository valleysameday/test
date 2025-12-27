/* --- VIEW POST PAGE LAYOUT --- */
.view-post-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 12px;
    max-width: 1100px;
    margin: 0 auto 100px; /* Space for bottom action bar */
}

/* --- GALLERY SECTION (LEFT) --- */
.view-post-left {
    background: var(--surface);
    border-radius: 24px;
    padding: 8px;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-soft);
}

.gallery {
    position: relative;
    border-radius: 18px;
    overflow: hidden;
    aspect-ratio: 4 / 3;
    background: #f1f5f9;
}

.gallery-slide img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.gallery-thumbs {
    display: flex;
    gap: 10px;
    padding: 12px 4px;
    overflow-x: auto;
    scrollbar-width: none;
}

.thumb-btn {
    width: 70px;
    height: 70px;
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid transparent;
    transition: 0.2s;
    flex-shrink: 0;
}

.thumb-btn.active {
    border-color: var(--brand-primary);
    transform: scale(1.05);
}

/* --- SELLER HEADER (NEW 2025 LOOK) --- */
.post-seller-header {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 16px;
    background: var(--surface-glass);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    margin-bottom: 20px;
    border: 1px solid var(--border-soft);
}

.seller-header-avatar {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--brand-primary);
}

.seller-header-info .posted-by {
    font-size: 0.95rem;
    color: var(--text-main);
}

.seller-header-info .posted-on {
    font-size: 0.75rem;
    color: var(--text-muted);
}

.view-listings-btn {
    background: none;
    border: none;
    color: var(--brand-primary);
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    padding: 0;
    margin-top: 4px;
    text-decoration: underline;
}

/* --- CONTENT SECTION (RIGHT) --- */
.view-post-right {
    display: flex;
    flex-direction: column;
}

.view-post-right h1 {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--brand-dark);
    margin-bottom: 8px;
    line-height: 1.2;
}

.post-price {
    font-size: 2rem;
    font-weight: 900;
    color: var(--brand-primary);
    margin-bottom: 15px;
}

.view-post-desc {
    font-size: 1rem;
    line-height: 1.6;
    color: #334155;
    background: #fff;
    padding: 16px;
    border-radius: 16px;
    margin-bottom: 20px;
}

.view-post-meta {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    background: #f8fafc;
    padding: 16px;
    border-radius: 16px;
    margin-bottom: 24px;
}

.view-post-meta p {
    font-size: 0.85rem;
    color: var(--text-muted);
}

.view-post-meta strong {
    color: var(--brand-dark);
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* --- CTA BUTTONS --- */
.engage-btn {
    width: 100%;
    padding: 16px;
    border-radius: 16px;
    background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
    color: white;
    font-size: 1.1rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    box-shadow: 0 10px 20px rgba(255, 126, 179, 0.3);
    margin-bottom: 12px;
    transition: 0.3s;
}

.engage-btn:active { transform: scale(0.97); }

.secondary-btn {
    width: 100%;
    padding: 12px;
    border-radius: 12px;
    background: #f1f5f9;
    color: var(--brand-dark);
    font-weight: 600;
    border: 1px solid var(--border-soft);
    cursor: pointer;
    margin-bottom: 8px;
}

/* --- BADGES --- */
.badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    margin-right: 5px;
}

.badge.business { background: var(--brand-dark); color: white; }
.badge.trusted { background: #10B981; color: white; }

/* --- DESKTOP ADAPTATION --- */
@media (min-width: 900px) {
    .view-post-layout {
        grid-template-columns: 1.2fr 1fr;
        gap: 40px;
        padding-top: 40px;
    }
    
    .view-post-right {
        position: sticky;
        top: 20px;
    }

    .view-post-right h1 { font-size: 2.2rem; }
}
