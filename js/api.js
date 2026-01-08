import { supabaseClient } from './config.js';

export async function getSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
}

export async function login(email, password) {
    return await supabaseClient.auth.signInWithPassword({ email, password });
}

export async function logout() {
    return await supabaseClient.auth.signOut();
}

export async function fetchCategories() {
    return await supabaseClient.from('categorias').select('*').order('orden');
}

export async function fetchProducts() {
    return await supabaseClient.from('productos').select('*').order('posicion', { ascending: true });
}

export async function updateProductsOrder(orderedProducts) {
    return await supabaseClient.from('productos').upsert(orderedProducts);
}

export async function fetchOffers() {
    return await supabaseClient.from('ofertas').select('*').order('created_at', { ascending: false });
}

export async function saveProduct(product) {
    const { id, ...data } = product;
    if (id) return await supabaseClient.from('productos').update(data).eq('id', id);
    return await supabaseClient.from('productos').insert([data]);
}

export async function deleteProduct(id) {
    return await supabaseClient.from('productos').delete().eq('id', id);
}

export async function saveCategory(category) {
    const { id, ...data } = category;
    if (id) return await supabaseClient.from('categorias').update(data).eq('id', id);
    return await supabaseClient.from('categorias').insert([data]);
}

export async function deleteCategory(id) {
    return await supabaseClient.from('categorias').delete().eq('id', id);
}

export async function saveOffer(offer) {
    const { id, ...data } = offer;
    if (id) return await supabaseClient.from('ofertas').update(data).eq('id', id);
    return await supabaseClient.from('ofertas').insert([data]);
}

export async function deleteOffer(id) {
    return await supabaseClient.from('ofertas').delete().eq('id', id);
}
