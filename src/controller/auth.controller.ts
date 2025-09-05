import AuthService from "../services/auth.service";
import { Request, Response } from "express";

class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }
  async login(req: Request, res: Response) {
    console.log(req.body);
    const { email, password } = req.body;
    const user = await this.authService.login(email, password);
    return res.status(200).json(user);
  }

  async register(req: Request, res: Response) {
    const { email, name, password } = req.body;

    const signedUp = await this.authService.register({ email, name, password });
    return res.status(200).json(signedUp);
  }
}

export default new AuthController();
