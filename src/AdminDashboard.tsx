import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Users, ShoppingBag, MessageSquare, MapPin, Plus, LogOut, Send, Loader2, Lock, Star, CheckCircle, XCircle } from 'lucide-react';

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticatedAdmin, setIsAuthenticatedAdmin] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'chat' | 'testimonials'>('dashboard');
  const [loading, setLoading] = useState(true);

  // Data states
  const [orders, setOrders] = useState<any[]>([]);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');

  // New Order Form
  const [newOrderId, setNewOrderId] = useState('');
  const [newOrderStatus, setNewOrderStatus] = useState('En préparation');
  const [newOrderLocation, setNewOrderLocation] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthenticatedAdmin) return;

    // Fetch Orders
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Chat Sessions
    const qChats = query(collection(db, 'chatSessions'), orderBy('updatedAt', 'desc'));
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      setChatSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Testimonials
    const qTestimonials = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
    const unsubTestimonials = onSnapshot(qTestimonials, (snapshot) => {
      setTestimonials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubOrders();
      unsubChats();
      unsubTestimonials();
    };
  }, [isAuthenticatedAdmin]);

  useEffect(() => {
    if (!selectedChat) return;
    const qMessages = query(collection(db, `chatSessions/${selectedChat}/messages`), orderBy('createdAt', 'asc'));
    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      setChatMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubMessages();
  }, [selectedChat]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234') {
      setIsAuthenticatedAdmin(true);
      setPinError('');
    } else {
      setPinError('Code PIN incorrect.');
      setPin('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticatedAdmin(false);
    setPin('');
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderId.trim()) return;
    try {
      await setDoc(doc(db, 'orders', newOrderId.trim().toUpperCase()), {
        status: newOrderStatus,
        location: newOrderLocation,
        createdAt: serverTimestamp()
      });
      setNewOrderId('');
      setNewOrderLocation('');
      alert("Commande ajoutée avec succès !");
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'ajout. Êtes-vous bien connecté avec le compte admin ?");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la mise à jour.");
    }
  };

  const handleApproveTestimonial = async (id: string) => {
    try {
      await updateDoc(doc(db, 'testimonials', id), { status: 'approved' });
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'approbation.");
    }
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet avis ?")) return;
    try {
      await deleteDoc(doc(db, 'testimonials', id));
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la suppression.");
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedChat) return;
    try {
      await addDoc(collection(db, `chatSessions/${selectedChat}/messages`), {
        text: replyText,
        isBot: true, // Mark as bot/admin
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'chatSessions', selectedChat), {
        lastMessage: replyText,
        updatedAt: serverTimestamp()
      });
      setReplyText('');
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'envoi.");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-cream"><Loader2 className="animate-spin text-gold-500" size={40} /></div>;

  if (!isAuthenticatedAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-900 px-4">
        <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gold-50 text-gold-500 rounded-full">
              <Lock size={32} />
            </div>
          </div>
          <h1 className="font-serif text-3xl mb-2 text-charcoal-900">Administration</h1>
          <p className="text-gray-500 mb-8">Entrez votre code PIN à 4 chiffres pour accéder au tableau de bord.</p>
          
          <form onSubmit={handlePinSubmit}>
            <input 
              type="password" 
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-3xl tracking-[1em] font-mono px-4 py-3 border border-gray-200 rounded-sm focus:outline-none focus:border-gold-500 mb-4"
              placeholder="••••"
              autoFocus
            />
            {pinError && <p className="text-red-500 text-sm mb-4">{pinError}</p>}
            <button 
              type="submit"
              className="w-full bg-gold-500 text-white py-3 rounded-sm hover:bg-gold-600 transition-colors font-medium"
            >
              Accéder
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-charcoal-900 text-white flex flex-col">
        <div className="p-6 border-b border-white/10">
          <h2 className="font-serif text-xl text-gold-500">Shukrani Admin</h2>
          <p className="text-xs text-gray-400 mt-1">Connecté via PIN</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${activeTab === 'dashboard' ? 'bg-gold-500 text-white' : 'text-gray-300 hover:bg-white/5'}`}>
            <ShoppingBag size={18} /> Vue d'ensemble
          </button>
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${activeTab === 'orders' ? 'bg-gold-500 text-white' : 'text-gray-300 hover:bg-white/5'}`}>
            <MapPin size={18} /> Commandes
          </button>
          <button onClick={() => setActiveTab('chat')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${activeTab === 'chat' ? 'bg-gold-500 text-white' : 'text-gray-300 hover:bg-white/5'}`}>
            <MessageSquare size={18} /> Messages en direct
          </button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-sm text-red-400 hover:bg-white/5 transition-colors">
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="font-serif text-3xl mb-8 text-charcoal-900">Vue d'ensemble</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-50 text-blue-500 rounded-full"><Users size={24} /></div>
                  <div>
                    <p className="text-sm text-gray-500">Visiteurs (Statique)</p>
                    <p className="text-2xl font-bold text-charcoal-900">1 245</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-gold-50 text-gold-500 rounded-full"><ShoppingBag size={24} /></div>
                  <div>
                    <p className="text-sm text-gray-500">Commandes suivies</p>
                    <p className="text-2xl font-bold text-charcoal-900">{orders.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-green-50 text-green-500 rounded-full"><MessageSquare size={24} /></div>
                  <div>
                    <p className="text-sm text-gray-500">Discussions actives</p>
                    <p className="text-2xl font-bold text-charcoal-900">{chatSessions.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h2 className="font-serif text-3xl mb-8 text-charcoal-900">Gestion des Commandes</h2>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8">
              <h3 className="font-medium text-lg mb-4 flex items-center gap-2"><Plus size={20} className="text-gold-500" /> Ajouter une commande</h3>
              <form onSubmit={handleCreateOrder} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">ID Commande (ex: SJS001)</label>
                  <input type="text" value={newOrderId} onChange={e => setNewOrderId(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-sm focus:outline-none focus:border-gold-500" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Localisation</label>
                  <input type="text" value={newOrderLocation} onChange={e => setNewOrderLocation(e.target.value)} placeholder="ex: Goma, Q. Les Volcans" className="w-full px-4 py-2 border border-gray-200 rounded-sm focus:outline-none focus:border-gold-500" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Statut</label>
                  <select value={newOrderStatus} onChange={e => setNewOrderStatus(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-sm focus:outline-none focus:border-gold-500">
                    <option value="En préparation">En préparation</option>
                    <option value="En cours de livraison">En cours de livraison</option>
                    <option value="Livrée">Livrée</option>
                  </select>
                </div>
                <button type="submit" className="bg-charcoal-900 text-white px-6 py-2 rounded-sm hover:bg-gold-500 transition-colors h-[42px]">Ajouter</button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-4 font-medium text-gray-600">ID Commande</th>
                    <th className="p-4 font-medium text-gray-600">Localisation</th>
                    <th className="p-4 font-medium text-gray-600">Statut</th>
                    <th className="p-4 font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="p-4 font-medium text-charcoal-900">{order.id}</td>
                      <td className="p-4 text-gray-600">{order.location || '-'}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs ${order.status === 'Livrée' ? 'bg-green-100 text-green-700' : order.status === 'En cours de livraison' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <select 
                          value={order.status} 
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                          className="text-sm border border-gray-200 rounded-sm px-2 py-1 focus:outline-none focus:border-gold-500"
                        >
                          <option value="En préparation">En préparation</option>
                          <option value="En cours de livraison">En cours de livraison</option>
                          <option value="Livrée">Livrée</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">Aucune commande trouvée.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            <h2 className="font-serif text-3xl mb-8 text-charcoal-900">Messages en direct</h2>
            <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 flex overflow-hidden min-h-[500px]">
              {/* Chat List */}
              <div className="w-1/3 border-r border-gray-100 overflow-y-auto">
                {chatSessions.map(session => (
                  <button 
                    key={session.id}
                    onClick={() => setSelectedChat(session.id)}
                    className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedChat === session.id ? 'bg-cream border-l-4 border-l-gold-500' : ''}`}
                  >
                    <p className="font-medium text-charcoal-900 truncate">Client {session.id.substring(0, 6)}...</p>
                    <p className="text-sm text-gray-500 truncate mt-1">{session.lastMessage || 'Nouvelle discussion'}</p>
                  </button>
                ))}
                {chatSessions.length === 0 && <p className="p-8 text-center text-gray-500">Aucun message.</p>}
              </div>
              
              {/* Chat Window */}
              <div className="w-2/3 flex flex-col bg-gray-50">
                {selectedChat ? (
                  <>
                    <div className="p-4 bg-white border-b border-gray-100 font-medium text-charcoal-900">
                      Discussion avec Client {selectedChat.substring(0, 6)}
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
                      {chatMessages.map(msg => (
                        <div key={msg.id} className={`max-w-[70%] p-3 rounded-lg text-sm ${msg.isBot ? 'bg-gold-500 text-white self-end rounded-tr-none shadow-sm' : 'bg-white border border-gray-200 text-gray-700 self-start rounded-tl-none shadow-sm'}`}>
                          {msg.text}
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-gray-100 flex gap-2">
                      <input 
                        type="text" 
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Répondre au client..." 
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:border-gold-500"
                      />
                      <button type="submit" className="bg-charcoal-900 text-white p-3 rounded-full hover:bg-gold-500 transition-colors">
                        <Send size={18} />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    Sélectionnez une discussion pour répondre
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Testimonials Tab */}
        {activeTab === 'testimonials' && (
          <div>
            <h2 className="font-serif text-3xl mb-8 text-charcoal-900">Gestion des Avis Clients</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {testimonials.map(testimonial => (
                <div key={testimonial.id} className={`bg-white p-6 rounded-sm shadow-sm border-l-4 ${testimonial.status === 'pending' ? 'border-yellow-400' : 'border-green-500'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-serif text-lg text-charcoal-900">{testimonial.name}</h3>
                      <p className="text-xs text-gray-500">{testimonial.location}</p>
                    </div>
                    <div className="flex text-gold-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill={i < testimonial.rating ? "currentColor" : "none"} className={i < testimonial.rating ? "" : "text-gray-300"} />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-6 italic">"{testimonial.text}"</p>
                  
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    {testimonial.status === 'pending' ? (
                      <>
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-sm font-medium mr-auto">En attente</span>
                        <button 
                          onClick={() => handleApproveTestimonial(testimonial.id)}
                          className="text-green-600 hover:bg-green-50 p-2 rounded-sm transition-colors flex items-center gap-1 text-sm"
                        >
                          <CheckCircle size={16} /> Approuver
                        </button>
                        <button 
                          onClick={() => handleDeleteTestimonial(testimonial.id)}
                          className="text-red-600 hover:bg-red-50 p-2 rounded-sm transition-colors flex items-center gap-1 text-sm"
                        >
                          <XCircle size={16} /> Rejeter
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-sm font-medium mr-auto">Publié</span>
                        <button 
                          onClick={() => handleDeleteTestimonial(testimonial.id)}
                          className="text-red-600 hover:bg-red-50 p-2 rounded-sm transition-colors flex items-center gap-1 text-sm"
                        >
                          <XCircle size={16} /> Supprimer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              
              {testimonials.length === 0 && (
                <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-sm border border-dashed border-gray-300">
                  Aucun avis pour le moment.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
