// api.js
// Data service for GuestCare backend API
// Depends on AuthService from auth.js

const ApiService = {
  // ---------- Agents ----------
  async getAgents() {
    const res = await AuthService.fetchWithAuth('/agents');
    return res.json();
  },

  async createAgent(agent) {
    const res = await AuthService.fetchWithAuth('/agents', {
      method: 'POST',
      body: JSON.stringify(agent)
    });
    return res.json();
  },

  async updateAgent(id, agent) {
    const res = await AuthService.fetchWithAuth(`/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(agent)
    });
    return res.json();
  },

  async deleteAgent(id) {
    await AuthService.fetchWithAuth(`/agents/${id}`, {
      method: 'DELETE'
    });
  },

  async syncAgent(agent) {
    const existing = await this.getAgents().then(data => data.find(a => a.id === agent.id));
    if (existing) {
      return this.updateAgent(agent.id, agent);
    } else {
      return this.createAgent(agent);
    }
  },

  // ---------- Properties ----------
  async getProperties() {
    const res = await AuthService.fetchWithAuth('/properties');
    return res.json();
  },

  async createProperty(property) {
    const res = await AuthService.fetchWithAuth('/properties', {
      method: 'POST',
      body: JSON.stringify(property)
    });
    return res.json();
  },

  async updateProperty(id, property) {
    const res = await AuthService.fetchWithAuth(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(property)
    });
    return res.json();
  },

  async deleteProperty(id) {
    await AuthService.fetchWithAuth(`/properties/${id}`, {
      method: 'DELETE'
    });
  },

  async syncProperty(property) {
    const existing = await this.getProperties().then(data => data.find(p => p.id === property.id));
    if (existing) {
      return this.updateProperty(property.id, property);
    } else {
      return this.createProperty(property);
    }
  },

  // ---------- Reviews ----------
  async getReviews() {
    const res = await AuthService.fetchWithAuth('/reviews');
    return res.json();
  },

  async createReview(review) {
    const res = await AuthService.fetchWithAuth('/reviews', {
      method: 'POST',
      body: JSON.stringify(review)
    });
    return res.json();
  },

  async updateReview(id, review) {
    const res = await AuthService.fetchWithAuth(`/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(review)
    });
    return res.json();
  },

  async deleteReview(id) {
    await AuthService.fetchWithAuth(`/reviews/${id}`, {
      method: 'DELETE'
    });
  },

  async syncReview(review) {
    const existing = await this.getReviews().then(data => data.find(r => r.id === review.id));
    if (existing) {
      return this.updateReview(review.id, review);
    } else {
      return this.createReview(review);
    }
  },

  // ---------- Messages ----------
  async getMessages() {
    const res = await AuthService.fetchWithAuth('/messages');
    return res.json();
  },

  async createMessage(message) {
    const res = await AuthService.fetchWithAuth('/messages', {
      method: 'POST',
      body: JSON.stringify(message)
    });
    return res.json();
  },

  async syncMessage(message) {
    return this.createMessage(message);
  },

  // ---------- Root Causes ----------
  async getRootCauses() {
    const res = await AuthService.fetchWithAuth('/root-cause');
    return res.json();
  },

  async createRootCause(rootCause) {
    const res = await AuthService.fetchWithAuth('/root-cause', {
      method: 'POST',
      body: JSON.stringify(rootCause)
    });
    return res.json();
  },

  // ---------- Sync Helpers ----------
  async pullAllData() {
    try {
      const [agents, messages, rootCauses, properties, reviews] = await Promise.all([
        this.getAgents(),
        this.getMessages(),
        this.getRootCauses(),
        this.getProperties(),
        this.getReviews()
      ]);
      return { agents, messages, rootCauses, properties, reviews };
    } catch (error) {
      console.error('Failed to pull data:', error);
      throw error;
    }
  }
};

window.ApiService = ApiService;