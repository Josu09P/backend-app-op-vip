import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user-dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { uploadFile, deleteFileByUrl } from '../firebase/cloud_storage'; // Importación corregida

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private userRepository: Repository<User>) {}

  create(user: CreateUserDto) {
    const newUser = this.userRepository.create(user);
    return this.userRepository.save(newUser);
  }

  findAll() {
    return this.userRepository.find({ relations: ['roles'] });
  }

  async update(id: number, user: UpdateUserDto) {
    const userFound = await this.userRepository.findOneBy({ id: id });

    if (!userFound) {
      throw new HttpException('Usuario no existe', HttpStatus.NOT_FOUND);
    }

    console.log('User:', user);

    const updatedUser = Object.assign(userFound, user);
    return this.userRepository.save(updatedUser);
  }

  // CREAR USUARIO CON IMAGEN - CORREGIDO
  async createWithImage(file: Express.Multer.File, user: CreateUserDto) {
    const url = await uploadFile(file, 'users'); // Cambiado storage por uploadFile

    if (!url) {
      throw new HttpException('La imagen no se pudo guardar', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    user.image = url;
    const newUser = this.userRepository.create(user);
    return this.userRepository.save(newUser);
  }

  // FILTRAR USUARIOS POR ROL
  async findClientsOnly() {
    return this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.roles', 'role')
      .where('role.id = :roleId', { roleId: 'CLIENT' })
      .getMany();
  }

  // ACTUALIZAR USUARIO CON IMAGEN - CORREGIDO
  async updateWithImage(file: Express.Multer.File, id: number, user: UpdateUserDto) {
    const url = await uploadFile(file, 'users'); // Cambiado storage por uploadFile
    console.log('URL: ' + url);
    console.log('UserURL: ', user);

    if (!url) {
      throw new HttpException('La imagen no se pudo guardar', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const userFound = await this.userRepository.findOneBy({ id: id });

    if (!userFound) {
      throw new HttpException('Usuario no existe', HttpStatus.NOT_FOUND);
    }

    // Eliminar imagen anterior si existe
    if (userFound.image) {
      await deleteFileByUrl(userFound.image);
    }

    user.image = url;
    const updatedUser = Object.assign(userFound, user);
    return this.userRepository.save(updatedUser);
  }
}
