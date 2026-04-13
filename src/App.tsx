import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Menu, X, MapPin, Phone, Mail, Instagram, ChevronRight, ChevronLeft, Flower2, Gem, Gift, Star, ShieldCheck, Truck, HeartHandshake, MessageCircle, Package, Loader2, CheckCircle, MessageSquare, Send } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, setDoc, where } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import AdminDashboard from './AdminDashboard';

const WHATSAPP_LINK = "https://wa.me/243992977129";
const WHATSAPP_COFFRET = "https://wa.me/243992977129?text=Bonjour,%20je%20souhaite%20cr%C3%A9er%20un%20coffret%20sur-mesure.";
const WHATSAPP_FLEURS = "https://wa.me/243992977129?text=Bonjour,%20je%20souhaite%20personnaliser%20une%20composition%20florale.";
const INSTAGRAM_LINK = "https://www.instagram.com/shukranjoyservices?igsh=MTlyNHFwZmZpZXB6Yg==";

export default function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'collection' | 'catalog' | 'mix' | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  
  // Order Tracking State
  const [trackingId, setTrackingId] = useState('');
  const [trackingStatus, setTrackingStatus] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Live Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{text: string, isBot: boolean, id?: string}[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Testimonials State
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [testimonialForm, setTestimonialForm] = useState({ name: '', location: '', text: '', rating: 5 });
  const [testimonialSubmitStatus, setTestimonialSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // Routing State
  const [currentRoute, setCurrentRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setCurrentRoute(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    
    const q = query(
      collection(db, `chatSessions/${userId}/messages`),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        text: doc.data().text,
        isBot: doc.data().isBot,
      }));
      
      if (messages.length === 0) {
        // Add initial bot message if empty
        addDoc(collection(db, `chatSessions/${userId}/messages`), {
          text: "Bonjour ! Comment pouvons-nous vous aider aujourd'hui ?",
          isBot: true,
          createdAt: serverTimestamp()
        }).catch(err => {
          handleFirestoreError(err, OperationType.CREATE, `chatSessions/${userId}/messages`);
        });
      } else {
        setChatMessages(messages);
      }
    }, (error) => {
      setChatError("Impossible de charger l'historique des messages.");
      handleFirestoreError(error, OperationType.LIST, `chatSessions/${userId}/messages`);
    });
    
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const q = query(
      collection(db, 'testimonials'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTestimonials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const galleryImages = [
    "https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/instant1.jpg",
    "https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/instant2.jpg",
    "https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/instant3.jpg",
    "https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/SnapInsta.to_639737272_17853358566670659_3039528001519013221_n.jpg",
    "https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/mix%201.jpg",
    "https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/bijoux%20baul%C3%A9.jpg",
    "https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/mix.jpg",
    "https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/mix3.jpg"
  ];

  const nextImage = () => setGalleryIndex((prev) => (prev + 1) % galleryImages.length);
  const prevImage = () => setGalleryIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) {
      setTrackingError("Veuillez entrer un numéro de commande.");
      setTrackingStatus(null);
      return;
    }

    setIsTracking(true);
    setTrackingError(null);
    setTrackingStatus(null);

    try {
      const id = trackingId.trim().toUpperCase();
      const orderRef = doc(db, 'orders', id);
      const orderSnap = await getDoc(orderRef);
      
      if (orderSnap.exists()) {
        setTrackingStatus(orderSnap.data().status);
      } else {
        // Fallback to simulated logic if not found in DB for demo purposes
        if (id.startsWith('SJS')) {
          const lastChar = id.slice(-1);
          if (lastChar === '1') {
            setTrackingStatus('En préparation');
          } else if (lastChar === '2') {
            setTrackingStatus('En cours de livraison');
          } else {
            setTrackingStatus('Livrée');
          }
        } else {
          setTrackingError("Commande introuvable. Assurez-vous que le numéro est correct.");
        }
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      setTrackingError("Désolé, nous n'avons pas pu récupérer les informations de votre commande. Veuillez réessayer plus tard.");
      handleFirestoreError(error, OperationType.GET, `orders/${trackingId.trim().toUpperCase()}`);
    } finally {
      setIsTracking(false);
    }
  };

  const handleSubmitTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimonialForm.name.trim() || !testimonialForm.text.trim()) return;
    
    setTestimonialSubmitStatus('submitting');
    try {
      await addDoc(collection(db, 'testimonials'), {
        name: testimonialForm.name.trim(),
        location: testimonialForm.location.trim() || 'Client(e)',
        text: testimonialForm.text.trim(),
        rating: testimonialForm.rating,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setTestimonialSubmitStatus('success');
      setTimeout(() => {
        setIsTestimonialModalOpen(false);
        setTestimonialSubmitStatus('idle');
        setTestimonialForm({ name: '', location: '', text: '', rating: 5 });
      }, 3000);
    } catch (error) {
      console.error("Error submitting testimonial:", error);
      setTestimonialSubmitStatus('error');
      handleFirestoreError(error, OperationType.CREATE, 'testimonials');
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    let currentUserId = userId;

    // Si l'utilisateur n'est pas connecté (ex: erreur d'auth anonyme), on réessaie
    if (!currentUserId) {
      try {
        const userCred = await signInAnonymously(auth);
        currentUserId = userCred.user.uid;
        setUserId(currentUserId);
      } catch (error: any) {
        console.error("Auth error:", error);
        setChatError("Veuillez activer l'authentification 'Anonyme' dans Firebase (Authentication > Sign-in method) pour utiliser le chat.");
        return;
      }
    }

    const messageText = chatInput.trim();
    setChatInput('');
    setChatError(null);

    try {
      // Add user message
      await addDoc(collection(db, `chatSessions/${currentUserId}/messages`), {
        text: messageText,
        isBot: false,
        createdAt: serverTimestamp()
      });

      // Update session document for admin tracking
      await setDoc(doc(db, 'chatSessions', currentUserId), {
        userId: currentUserId,
        lastMessage: messageText,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Simulate bot reply ONLY if it's the first message or if we want an auto-reply
      // For now, we'll just let the admin reply manually, but we can keep a small auto-reply
      setTimeout(async () => {
        try {
          const botMsg = "Merci pour votre message. Un conseiller va vous répondre sous peu.";
          await addDoc(collection(db, `chatSessions/${currentUserId}/messages`), {
            text: botMsg,
            isBot: true,
            createdAt: serverTimestamp()
          });
          await setDoc(doc(db, 'chatSessions', currentUserId), {
            lastMessage: botMsg,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `chatSessions/${currentUserId}/messages`);
        }
      }, 1000);
    } catch (error) {
      console.error("Error sending message:", error);
      setChatError("Impossible d'envoyer le message. Veuillez vérifier votre connexion et réessayer.");
      handleFirestoreError(error, OperationType.CREATE, `chatSessions/${currentUserId}/messages`);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  if (currentRoute === '#admin') {
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen font-sans bg-cream text-charcoal-900 selection:bg-gold-500 selection:text-white">
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
          <a href="#" className="font-serif text-2xl font-bold tracking-tight flex items-center gap-3 leading-none">
            <img src="https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/logo.jpg" alt="Shukrani Logo" className="h-10 w-10 rounded-full object-cover shadow-sm" referrerPolicy="no-referrer" />
            <div className="flex flex-col">
              <span className={isScrolled ? 'text-charcoal-900' : 'text-white'}>SHUKRANI</span>
              <span className={`text-sm font-sans tracking-widest uppercase ${isScrolled ? 'text-gold-500' : 'text-gold-400'}`}>Joy Services</span>
            </div>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#services" className={`text-sm uppercase tracking-wider hover:text-gold-500 transition-colors ${isScrolled ? 'text-charcoal-800' : 'text-white/90'}`}>Services</a>
            <a href="#tarifs" className={`text-sm uppercase tracking-wider hover:text-gold-500 transition-colors ${isScrolled ? 'text-charcoal-800' : 'text-white/90'}`}>Tarifs</a>
            <a href="#galerie" className={`text-sm uppercase tracking-wider hover:text-gold-500 transition-colors ${isScrolled ? 'text-charcoal-800' : 'text-white/90'}`}>Galerie</a>
            <a 
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gold-500 hover:bg-gold-600 text-white px-6 py-2.5 rounded-sm text-sm uppercase tracking-wider transition-all duration-300"
            >
              Commander
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className={isScrolled ? 'text-charcoal-900' : 'text-white'} />
            ) : (
              <Menu className={isScrolled ? 'text-charcoal-900' : 'text-white'} />
            )}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg py-6 px-6 flex flex-col space-y-4">
            <a href="#services" onClick={() => setIsMobileMenuOpen(false)} className="text-charcoal-800 uppercase tracking-wider text-sm py-2 border-b border-gray-100">Services</a>
            <a href="#tarifs" onClick={() => setIsMobileMenuOpen(false)} className="text-charcoal-800 uppercase tracking-wider text-sm py-2 border-b border-gray-100">Tarifs</a>
            <a href="#galerie" onClick={() => setIsMobileMenuOpen(false)} className="text-charcoal-800 uppercase tracking-wider text-sm py-2 border-b border-gray-100">Galerie</a>
            <a 
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gold-500 text-white text-center px-6 py-3 rounded-sm text-sm uppercase tracking-wider mt-4"
            >
              Commander
            </a>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1563241527-3004b7be0ffd?q=80&w=2574&auto=format&fit=crop" 
            alt="Luxury Roses" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-charcoal-900/60"></div>
        </div>
        
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto mt-20">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="font-serif text-5xl md:text-7xl lg:text-8xl text-white mb-6 leading-tight"
          >
            Créez des souvenirs <span className="text-gold-400 italic">éternels.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-lg md:text-xl text-white/90 font-light max-w-2xl mx-auto mb-10"
          >
            Spécialiste en compositions florales de prestige et bijoux Baoulé authentiques à Bukavu et Goma.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a href="#tarifs" className="w-full sm:w-auto bg-white text-charcoal-900 hover:bg-gray-100 px-8 py-4 rounded-sm text-sm uppercase tracking-widest transition-colors">
              Découvrir nos offres
            </a>
            <a href="#galerie" className="w-full sm:w-auto border border-white/30 text-white hover:bg-white/10 px-8 py-4 rounded-sm text-sm uppercase tracking-widest transition-colors backdrop-blur-sm">
              Voir la galerie
            </a>
          </motion.div>
        </div>
      </section>

      {/* Trust/Guarantees Section - NEW */}
      <section className="py-12 bg-charcoal-900 text-gold-500 relative z-10 -mt-8 mx-6 md:mx-auto max-w-6xl rounded-sm shadow-2xl">
        <div className="px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-gold-500/20">
            <div className="p-4 flex flex-col items-center">
              <ShieldCheck size={36} className="mb-4" />
              <h3 className="font-serif text-white text-lg mb-2">Qualité Premium</h3>
              <p className="text-sm text-gray-400 font-light">Des produits sélectionnés avec la plus grande exigence pour un résultat parfait.</p>
            </div>
            <div className="p-4 flex flex-col items-center pt-8 md:pt-4">
              <HeartHandshake size={36} className="mb-4" />
              <h3 className="font-serif text-white text-lg mb-2">Service Sur-Mesure</h3>
              <p className="text-sm text-gray-400 font-light">Chaque création est unique, pensée et adaptée selon vos envies et votre budget.</p>
            </div>
            <div className="p-4 flex flex-col items-center pt-8 md:pt-4">
              <Truck size={36} className="mb-4" />
              <h3 className="font-serif text-white text-lg mb-2">Livraison Soignée</h3>
              <p className="text-sm text-gray-400 font-light">Une remise en main propre élégante pour un effet de surprise garanti.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 md:py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
            className="text-center mb-20"
          >
            <h2 className="font-serif text-4xl md:text-5xl mb-6">Notre Savoir-Faire</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              Chaque création est une œuvre d'art unique pensée pour exprimer l'inexprimable.
            </p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-12"
          >
            {/* Service 1 */}
            <motion.div variants={fadeIn} className="group cursor-pointer">
              <div className="mb-6 overflow-hidden aspect-[4/5] relative">
                <img 
                  src="https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/SnapInsta.to_639737272_17853358566670659_3039528001519013221_n.jpg" 
                  alt="Compositions Florales" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500"></div>
              </div>
              <div className="flex items-center gap-3 mb-3 text-gold-500">
                <Flower2 size={24} strokeWidth={1.5} />
                <h3 className="font-serif text-2xl text-charcoal-900">Compositions Florales</h3>
              </div>
              <p className="text-gray-600 mb-6 font-light leading-relaxed">
                Roses de haute qualité, montées en bouquets ronds ou pyramides de 1 à 250 roses.
              </p>
              <a href={WHATSAPP_FLEURS} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm uppercase tracking-widest font-medium text-charcoal-900 hover:text-gold-500 transition-colors">
                Personnaliser <ChevronRight size={16} className="ml-1" />
              </a>
            </motion.div>

            {/* Service 2 */}
            <motion.div variants={fadeIn} className="group cursor-pointer">
              <div className="mb-6 overflow-hidden aspect-[4/5] relative">
                <img 
                  src="https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/bijoux%20baul%C3%A9.jpg" 
                  alt="Bijoux Baoulé" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500"></div>
              </div>
              <div className="flex items-center gap-3 mb-3 text-gold-500">
                <Gem size={24} strokeWidth={1.5} />
                <h3 className="font-serif text-2xl text-charcoal-900">Bijoux Baoulé</h3>
              </div>
              <p className="text-gray-600 mb-6 font-light leading-relaxed">
                L'héritage de la culture Baoulé à travers des bagues Lotus et colliers en finition or.
              </p>
              <button onClick={() => setActiveModal('collection')} className="inline-flex items-center text-sm uppercase tracking-widest font-medium text-charcoal-900 hover:text-gold-500 transition-colors">
                Voir la collection <ChevronRight size={16} className="ml-1" />
              </button>
            </motion.div>

            {/* Service 3 */}
            <motion.div variants={fadeIn} className="group cursor-pointer">
              <div className="mb-6 overflow-hidden aspect-[4/5] relative">
                <img 
                  src="https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/mix%201.jpg" 
                  alt="Coffrets Signature" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500"></div>
              </div>
              <div className="flex items-center gap-3 mb-3 text-gold-500">
                <Gift size={24} strokeWidth={1.5} />
                <h3 className="font-serif text-2xl text-charcoal-900">Coffrets Signature</h3>
              </div>
              <p className="text-gray-600 mb-6 font-light leading-relaxed">
                Des accords parfaits entre champagne, chocolats fins et fleurs fraîches pour marquer l'esprit.
              </p>
              <button onClick={() => setActiveModal('mix')} className="inline-flex items-center text-sm uppercase tracking-widest font-medium text-charcoal-900 hover:text-gold-500 transition-colors">
                Découvrir les mix <ChevronRight size={16} className="ml-1" />
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Founders Section */}
      <section className="py-24 px-6 bg-cream border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-4xl md:text-5xl mb-6">L'Équipe Dirigeante</h2>
            <div className="w-24 h-px bg-gold-500 mx-auto mb-6"></div>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              La passion et l'expertise au service de vos moments les plus précieux.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            {/* Boss 1 Placeholder */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center group"
            >
              <div className="mb-6 overflow-hidden aspect-[3/4] relative rounded-sm">
                <img 
                  src="https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/boos1.jpg" 
                  alt="Yvette" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="font-serif text-2xl text-charcoal-900 mb-2">Yvette</h3>
              <p className="text-gold-500 text-sm uppercase tracking-widest font-medium">Co-Fondatrice</p>
            </motion.div>

            {/* Boss 2 Placeholder */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-center group"
            >
              <div className="mb-6 overflow-hidden aspect-[3/4] relative rounded-sm">
                <img 
                  src="https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/boss.jpg" 
                  alt="Fondatrice 2" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="font-serif text-2xl text-charcoal-900 mb-2">Co-Fondatrice</h3>
              <p className="text-gold-500 text-sm uppercase tracking-widest font-medium">Co-Fondatrice</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing / Offers Section */}
      <section id="tarifs" className="py-24 md:py-32 px-6 bg-charcoal-900 text-white">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-20"
          >
            <h2 className="font-serif text-4xl md:text-5xl mb-6">Investir dans le plaisir</h2>
            <div className="w-24 h-px bg-gold-500 mx-auto"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h3 className="font-serif text-3xl text-gold-400 mb-6">Roses d'Exception</h3>
              <p className="text-gray-400 font-light mb-8 leading-relaxed">
                Nos roses sont sélectionnées avec la plus grande rigueur pour garantir une tenue et une beauté incomparables. Disponibles en plusieurs coloris selon les arrivages.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="font-light">Bouquet Classique (12 roses)</span>
                  <span className="font-serif text-gold-400">Sur devis</span>
                </li>
                <li className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="font-light">Bouquet Prestige (50 roses)</span>
                  <span className="font-serif text-gold-400">Sur devis</span>
                </li>
                <li className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="font-light">Pyramide Royale (100+ roses)</span>
                  <span className="font-serif text-gold-400">Sur devis</span>
                </li>
              </ul>
              <button onClick={() => setActiveModal('catalog')} className="inline-block border border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-white px-8 py-3 rounded-sm text-sm uppercase tracking-widest transition-all">
                Voir le catalogue
              </button>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h3 className="font-serif text-3xl text-gold-400 mb-6">Coffrets & Mix</h3>
              <p className="text-gray-400 font-light mb-8 leading-relaxed">
                L'art d'offrir sublimé. Nos coffrets associent la délicatesse des fleurs à la gourmandise et au raffinement.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="font-light">Coffret Fleurs & Chocolats</span>
                  <span className="font-serif text-gold-400">Sur devis</span>
                </li>
                <li className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="font-light">Coffret Champagne & Roses</span>
                  <span className="font-serif text-gold-400">Sur devis</span>
                </li>
                <li className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="font-light">Parure Baoulé & Écrin Floral</span>
                  <span className="font-serif text-gold-400">Sur devis</span>
                </li>
              </ul>
              <a href={WHATSAPP_COFFRET} target="_blank" rel="noopener noreferrer" className="inline-block border border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-white px-8 py-3 rounded-sm text-sm uppercase tracking-widest transition-all">
                Créer un coffret sur-mesure
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="galerie" className="py-24 md:py-32 px-6 bg-cream">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="flex flex-col md:flex-row justify-between items-end mb-16"
          >
            <div>
              <h2 className="font-serif text-4xl md:text-5xl mb-4">Instants Choisis</h2>
              <p className="text-gray-500 max-w-xl text-lg">
                Un aperçu de nos réalisations et des émotions que nous avons eu le privilège de transmettre.
              </p>
            </div>
            <a href={INSTAGRAM_LINK} target="_blank" rel="noopener noreferrer" className="hidden md:inline-flex items-center text-sm uppercase tracking-widest font-medium text-charcoal-900 hover:text-gold-500 transition-colors">
              Suivez-nous sur les réseaux <ChevronRight size={16} className="ml-1" />
            </a>
          </motion.div>

          <div className="relative max-w-5xl mx-auto">
            <div className="overflow-hidden aspect-[4/3] md:aspect-[2/1] relative rounded-sm shadow-xl bg-charcoal-900">
              <motion.img
                key={galleryIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                src={galleryImages[galleryIndex]}
                alt={`Instants Choisis ${galleryIndex + 1}`}
                className="w-full h-full object-contain md:object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <button 
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-charcoal-900 p-3 rounded-full shadow-lg transition-all z-10"
              aria-label="Image précédente"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-charcoal-900 p-3 rounded-full shadow-lg transition-all z-10"
              aria-label="Image suivante"
            >
              <ChevronRight size={24} />
            </button>

            <div className="flex justify-center mt-8 gap-3">
              {galleryImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setGalleryIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${idx === galleryIndex ? 'bg-gold-500 w-8' : 'bg-gray-300 hover:bg-gold-300 w-2'}`}
                  aria-label={`Aller à l'image ${idx + 1}`}
                />
              ))}
            </div>
          </div>
          
          <div className="mt-8 md:hidden text-center">
            <a href={INSTAGRAM_LINK} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm uppercase tracking-widest font-medium text-charcoal-900 hover:text-gold-500 transition-colors">
              Suivez-nous sur les réseaux <ChevronRight size={16} className="ml-1" />
            </a>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-4xl md:text-5xl mb-6">Mots Doux</h2>
            <div className="w-24 h-px bg-gold-500 mx-auto mb-6"></div>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg mb-8">
              Ce que nos clients disent de nos créations.
            </p>
            <button 
              onClick={() => setIsTestimonialModalOpen(true)}
              className="inline-flex items-center gap-2 bg-charcoal-900 text-white px-6 py-3 rounded-sm hover:bg-gold-500 transition-colors text-sm uppercase tracking-widest"
            >
              <MessageSquare size={16} /> Laisser un avis
            </button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.length > 0 ? (
              testimonials.map((testimonial, idx) => (
                <motion.div 
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: idx * 0.2 }}
                  className="bg-cream p-8 rounded-sm relative"
                >
                  <div className="flex text-gold-500 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill={i < testimonial.rating ? "currentColor" : "none"} className={i < testimonial.rating ? "" : "text-gray-300"} />
                    ))}
                  </div>
                  <p className="text-gray-600 font-light italic mb-6">
                    "{testimonial.text}"
                  </p>
                  <div>
                    <h4 className="font-serif text-charcoal-900 text-lg">{testimonial.name}</h4>
                    <p className="text-xs text-gold-500 uppercase tracking-widest">{testimonial.location}</p>
                  </div>
                </motion.div>
              ))
            ) : (
              // Fallback hardcoded testimonials if DB is empty
              <>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="bg-cream p-8 rounded-sm relative"
                >
                  <div className="flex text-gold-500 mb-4">
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                  </div>
                  <p className="text-gray-600 font-light italic mb-6">
                    "Le bouquet prestige que j'ai commandé pour l'anniversaire de ma femme était tout simplement époustouflant. Les roses étaient d'une qualité exceptionnelle et la présentation très soignée."
                  </p>
                  <div>
                    <h4 className="font-serif text-charcoal-900 text-lg">Marc D.</h4>
                    <p className="text-xs text-gold-500 uppercase tracking-widest">Goma</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="bg-cream p-8 rounded-sm relative"
                >
                  <div className="flex text-gold-500 mb-4">
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                  </div>
                  <p className="text-gray-600 font-light italic mb-6">
                    "J'ai opté pour un coffret sur-mesure avec champagne et bijoux Baoulé. Le service client a été à l'écoute de mes moindres désirs. Un cadeau inoubliable !"
                  </p>
                  <div>
                    <h4 className="font-serif text-charcoal-900 text-lg">Sarah M.</h4>
                    <p className="text-xs text-gold-500 uppercase tracking-widest">Bukavu</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="bg-cream p-8 rounded-sm relative"
                >
                  <div className="flex text-gold-500 mb-4">
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                  </div>
                  <p className="text-gray-600 font-light italic mb-6">
                    "Les bijoux Baoulé sont magnifiques, d'une finesse rare. On sent vraiment l'authenticité et le savoir-faire. Je recommande Shukrani Joy Services les yeux fermés."
                  </p>
                  <div>
                    <h4 className="font-serif text-charcoal-900 text-lg">Aline K.</h4>
                    <p className="text-xs text-gold-500 uppercase tracking-widest">Goma</p>
                  </div>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Order Tracking Section */}
      <section className="py-24 px-6 bg-cream border-t border-gray-200">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
          >
            <Package size={40} className="mx-auto text-gold-500 mb-6" />
            <h2 className="font-serif text-3xl md:text-4xl mb-4">Suivi de Commande</h2>
            <p className="text-gray-500 mb-8 max-w-lg mx-auto">
              Entrez votre numéro de commande pour connaître l'état d'avancement de votre livraison.
            </p>
            
            <form onSubmit={handleTrackOrder} className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto mb-8">
              <input 
                type="text" 
                placeholder="Ex: SJS123" 
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className="px-6 py-3 border border-gray-300 rounded-sm focus:outline-none focus:border-gold-500 flex-1 bg-white text-charcoal-900"
              />
              <button 
                type="submit" 
                disabled={isTracking}
                className="bg-charcoal-900 text-white px-8 py-3 rounded-sm hover:bg-charcoal-800 transition-colors flex items-center justify-center disabled:opacity-70 min-w-[120px]"
              >
                {isTracking ? <Loader2 className="animate-spin" size={20} /> : "Suivre"}
              </button>
            </form>

            {/* Tracking Results */}
            <div className="h-24">
              {trackingError && (
                <motion.p initial={{opacity:0}} animate={{opacity:1}} className="text-red-500 text-sm">
                  {trackingError}
                </motion.p>
              )}
              {trackingStatus && (
                <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="bg-white p-6 rounded-sm shadow-md inline-block text-left border-t-4 border-gold-500 min-w-[250px]">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Statut de la commande {trackingId.toUpperCase()}</p>
                  <p className="font-serif text-xl text-charcoal-900 flex items-center gap-3">
                    {trackingStatus === 'Livrée' && <CheckCircle className="text-green-500" size={24} />}
                    {trackingStatus === 'En cours de livraison' && <Truck className="text-gold-500" size={24} />}
                    {trackingStatus === 'En préparation' && <Package className="text-blue-500" size={24} />}
                    {trackingStatus}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gold-500 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-4xl md:text-5xl mb-6">Envie de faire plaisir ?</h2>
          <p className="text-white/90 text-lg mb-10 font-light">
            Nous livrons vos émotions à Bukavu et Goma. Discutons de votre projet personnalisé dès aujourd'hui.
          </p>
          <a 
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-charcoal-900 text-white hover:bg-charcoal-800 px-10 py-4 rounded-sm text-sm uppercase tracking-widest transition-colors shadow-xl"
          >
            Parler sur WhatsApp
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal-900 text-white/70 pt-24 pb-12 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          {/* Brand */}
          <div className="lg:pr-8">
            <a href="#" className="font-serif text-2xl font-bold tracking-tight flex items-center gap-3 leading-none mb-6 text-white">
              <img src="https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/logo.jpg" alt="Shukrani Logo" className="h-12 w-12 rounded-full object-cover shadow-sm" referrerPolicy="no-referrer" />
              <div className="flex flex-col">
                <span>SHUKRANI</span>
                <span className="text-sm font-sans tracking-widest uppercase text-gold-500">Joy Services</span>
              </div>
            </a>
            <p className="font-light text-sm leading-relaxed mb-8">
              Votre partenaire de confiance pour les cadeaux de luxe, les créations florales et l'artisanat d'exception. Créons ensemble des moments inoubliables.
            </p>
            <div className="flex gap-4">
              <a href={INSTAGRAM_LINK} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-gold-500 hover:text-white transition-all">
                <Instagram size={18} />
              </a>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-all">
                <MessageCircle size={18} />
              </a>
            </div>
          </div>
          
          {/* Liens Rapides */}
          <div>
            <h4 className="text-white font-serif text-xl mb-6">Liens Rapides</h4>
            <ul className="space-y-3 font-light text-sm">
              <li><a href="#services" className="hover:text-gold-400 transition-colors flex items-center gap-2"><ChevronRight size={14} className="text-gold-500" /> Nos Services</a></li>
              <li><a href="#tarifs" className="hover:text-gold-400 transition-colors flex items-center gap-2"><ChevronRight size={14} className="text-gold-500" /> Tarifs & Catalogue</a></li>
              <li><a href="#galerie" className="hover:text-gold-400 transition-colors flex items-center gap-2"><ChevronRight size={14} className="text-gold-500" /> Notre Galerie</a></li>
              <li><a href="#suivi" className="hover:text-gold-400 transition-colors flex items-center gap-2"><ChevronRight size={14} className="text-gold-500" /> Suivre ma commande</a></li>
            </ul>
          </div>

          {/* Nos Spécialités */}
          <div>
            <h4 className="text-white font-serif text-xl mb-6">Nos Spécialités</h4>
            <ul className="space-y-3 font-light text-sm">
              <li><button onClick={() => setActiveModal('mix')} className="hover:text-gold-400 transition-colors flex items-center gap-2"><ChevronRight size={14} className="text-gold-500" /> Coffrets Sur-Mesure</button></li>
              <li><button onClick={() => setActiveModal('collection')} className="hover:text-gold-400 transition-colors flex items-center gap-2"><ChevronRight size={14} className="text-gold-500" /> Créations Florales</button></li>
              <li><button onClick={() => setActiveModal('catalog')} className="hover:text-gold-400 transition-colors flex items-center gap-2"><ChevronRight size={14} className="text-gold-500" /> Artisanat d'Exception</button></li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h4 className="text-white font-serif text-xl mb-6">Contact</h4>
            <ul className="space-y-4 font-light text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-gold-500 shrink-0 mt-0.5" />
                <span>Bukavu & Goma<br/>République Démocratique du Congo</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-gold-500 shrink-0" />
                <a href={WHATSAPP_LINK} className="hover:text-white transition-colors">+243 992 977 129</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-gold-500 shrink-0" />
                <a href="mailto:contact@shukranijoys.com" className="hover:text-white transition-colors">contact@shukranijoys.com</a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-light">
          <p>© {new Date().getFullYear()} Shukrani Joy Services. Tous droits réservés.</p>
          <div className="flex gap-4 md:gap-6">
            <a href="#privacy" className="hover:text-gold-400 transition-colors">Politique de confidentialité</a>
            <a href="#terms" className="hover:text-gold-400 transition-colors">Conditions générales de vente</a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isTestimonialModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal-900/90 backdrop-blur-sm">
          <div className="bg-white rounded-sm w-full max-w-lg relative shadow-2xl p-8">
            <button 
              onClick={() => setIsTestimonialModalOpen(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-charcoal-900 transition-colors"
            >
              <X size={24} />
            </button>
            <h3 className="font-serif text-2xl mb-2 text-charcoal-900">Laisser un avis</h3>
            <p className="text-gray-500 text-sm mb-6">Partagez votre expérience avec Shukrani Joy Services.</p>

            {testimonialSubmitStatus === 'success' ? (
              <div className="text-center py-8">
                <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-charcoal-900">Merci pour votre avis !</p>
                <p className="text-gray-500 mt-2">Il sera publié après validation par notre équipe.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitTestimonial} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Votre nom</label>
                  <input 
                    type="text" 
                    required
                    value={testimonialForm.name}
                    onChange={e => setTestimonialForm({...testimonialForm, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville (Optionnel)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Goma"
                    value={testimonialForm.location}
                    onChange={e => setTestimonialForm({...testimonialForm, location: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setTestimonialForm({...testimonialForm, rating: star})}
                        className="focus:outline-none"
                      >
                        <Star size={24} fill={star <= testimonialForm.rating ? "#D4AF37" : "none"} className={star <= testimonialForm.rating ? "text-gold-500" : "text-gray-300"} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Votre message</label>
                  <textarea 
                    required
                    rows={4}
                    value={testimonialForm.text}
                    onChange={e => setTestimonialForm({...testimonialForm, text: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-gold-500 resize-none"
                  ></textarea>
                </div>
                {testimonialSubmitStatus === 'error' && (
                  <p className="text-red-500 text-sm">Une erreur est survenue. Veuillez réessayer.</p>
                )}
                <button 
                  type="submit" 
                  disabled={testimonialSubmitStatus === 'submitting'}
                  className="w-full bg-gold-500 text-white py-3 rounded-sm hover:bg-gold-600 transition-colors flex justify-center items-center"
                >
                  {testimonialSubmitStatus === 'submitting' ? <Loader2 className="animate-spin" size={20} /> : "Envoyer mon avis"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-charcoal-900/90 backdrop-blur-sm">
          <div className="bg-cream rounded-sm w-full max-w-5xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
            <button 
              onClick={() => setActiveModal(null)} 
              className="absolute top-4 right-4 text-charcoal-900 hover:text-gold-500 z-10 bg-white/80 rounded-full p-2 backdrop-blur-sm transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="p-6 md:p-12">
              {activeModal === 'collection' && (
                <>
                  <h3 className="font-serif text-3xl md:text-4xl mb-8 text-center text-charcoal-900">Notre Collection</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <img src="https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/SnapInsta.to_631784483_17852901327670659_6965523312232292238_n.jpg" alt="Collection" className="w-full h-64 object-cover rounded-sm" referrerPolicy="no-referrer" />
                    <img src="https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/SnapInsta.to_632839966_17853358617670659_6947828260499031016_n.jpg" alt="Collection" className="w-full h-64 object-cover rounded-sm" referrerPolicy="no-referrer" />
                    <img src="https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/SnapInsta.to_635061677_17852912679670659_2663979621881965116_n.jpg" alt="Collection" className="w-full h-64 object-cover rounded-sm" referrerPolicy="no-referrer" />
                    <img src="https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/SnapInsta.to_636106591_17852901270670659_37676554594800815_n.jpg" alt="Collection" className="w-full h-64 object-cover rounded-sm" referrerPolicy="no-referrer" />
                    <img src="https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/SnapInsta.to_638356013_17852912661670659_4386693003622545334_n.jpg" alt="Collection" className="w-full h-64 object-cover rounded-sm" referrerPolicy="no-referrer" />
                    <img src="https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/bijoux%20baul%C3%A9.jpg" alt="Collection" className="w-full h-64 object-cover rounded-sm" referrerPolicy="no-referrer" />
                  </div>
                </>
              )}

              {activeModal === 'catalog' && (
                <>
                  <h3 className="font-serif text-3xl md:text-4xl mb-8 text-center text-charcoal-900">Notre Catalogue</h3>
                  <div className="flex justify-center">
                    <img src="https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/tariff.jpg" alt="Catalogue des tarifs" className="max-w-full h-auto rounded-sm shadow-lg" referrerPolicy="no-referrer" />
                  </div>
                  <div className="mt-8 text-center">
                    <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="inline-block bg-gold-500 text-white hover:bg-gold-600 px-8 py-3 rounded-sm text-sm uppercase tracking-widest transition-colors">
                      Commander sur WhatsApp
                    </a>
                  </div>
                </>
              )}

              {activeModal === 'mix' && (
                <>
                  <h3 className="font-serif text-3xl md:text-4xl mb-8 text-center text-charcoal-900">Nos Coffrets & Mix</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <img src="https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/mix.jpg" alt="Mix" className="w-full h-80 object-cover rounded-sm shadow-md" referrerPolicy="no-referrer" />
                    <img src="https://raw.githubusercontent.com/Mapendano/Shukran-Joy-Services-/main/imgs/mix3.jpg" alt="Mix" className="w-full h-80 object-cover rounded-sm shadow-md" referrerPolicy="no-referrer" />
                  </div>
                  <div className="mt-8 text-center">
                    <a href={WHATSAPP_COFFRET} target="_blank" rel="noopener noreferrer" className="inline-block bg-gold-500 text-white hover:bg-gold-600 px-8 py-3 rounded-sm text-sm uppercase tracking-widest transition-colors">
                      Personnaliser mon coffret
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Floating WhatsApp Button */}
      <a 
        href={WHATSAPP_LINK} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="fixed bottom-[5.5rem] right-6 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:bg-[#128C7E] hover:scale-110 transition-all z-40 flex items-center justify-center group"
        aria-label="Contactez-nous sur WhatsApp"
      >
        <MessageCircle size={32} />
        <span className="absolute right-full mr-4 bg-white text-charcoal-900 text-sm px-4 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-medium">
          WhatsApp
        </span>
      </a>

      {/* Live Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isChatOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-white rounded-lg shadow-2xl w-80 sm:w-96 mb-4 overflow-hidden border border-gray-200 flex flex-col h-[400px]"
          >
            {/* Header */}
            <div className="bg-charcoal-900 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageSquare size={20} className="text-gold-500" />
                <span className="font-serif font-medium">Support Shukrani</span>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-gray-300 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-cream/30 flex flex-col gap-3">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.isBot ? 'bg-white border border-gray-100 text-gray-700 self-start rounded-tl-none shadow-sm' : 'bg-gold-500 text-white self-end rounded-tr-none shadow-sm'}`}>
                  {msg.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {chatError && (
              <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100 text-center">
                {chatError}
              </div>
            )}
            <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-gray-100 flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Écrivez votre message..." 
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-gold-500"
              />
              <button type="submit" className="bg-charcoal-900 text-white p-2.5 rounded-full hover:bg-gold-500 transition-colors">
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}

        {/* Chat Toggle Button */}
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="bg-charcoal-900 text-white p-4 rounded-full shadow-2xl hover:bg-gold-500 hover:scale-110 transition-all flex items-center justify-center group"
          aria-label="Ouvrir le chat"
        >
          {isChatOpen ? <X size={32} /> : <MessageSquare size={32} />}
          {!isChatOpen && (
            <span className="absolute right-full mr-4 bg-white text-charcoal-900 text-sm px-4 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-medium">
              Discuter en direct
            </span>
          )}
        </button>
      </div>

    </div>
  );
}
