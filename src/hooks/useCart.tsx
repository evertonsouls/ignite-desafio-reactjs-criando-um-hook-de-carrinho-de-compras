import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {    
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    
     if (storagedCart) {
       return JSON.parse(storagedCart);
     }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const responseStock = await api.get(`/stock/${productId}`)
      const stock = responseStock.data
      if (!stock.id) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const productIndex = cart.findIndex(item => item.id === productId)

      if (productIndex === -1){

        if (stock.amount === 0) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const response = await api.get(`/products/${productId}`)
        const { data } = response
        cart.push({
          ...data,
          amount: 1,
        })
      }
      else {
        if (stock.amount < cart[productIndex].amount + 1) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        cart[productIndex].amount += 1
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))      
      setCart([...cart])
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(item => item.id === productId)

      if (productIndex === -1) {
        throw new Error('Erro na remoção do produto')
      }

      cart.splice(productIndex, 1)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
      setCart([...cart])
    } catch (e) {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return

      const responseStock = await api.get<Stock>(`/stock/${productId}`)
      const { data } = responseStock
      if (data.amount < amount){
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }

      const newCart = cart.map(product => 
        product.id === productId 
        ? {...product, amount}
        : product
      )

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      setCart(newCart)
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
