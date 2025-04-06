#!/usr/bin/env python3

import os
import sys

def draw_tree():
    """
    Draw an ASCII art tree with foliage and a trunk
    """
    # Tree foliage
    print("    *    ")
    print("   ***   ")
    print("  *****  ")
    print(" ******* ")
    print("*********")
    
    # Tree trunk
    print("    |    ")
    print("    |    ")
    print("    |    ")
    print("~~~~~~~~~~~~")
    print("Under one tree")
    print()
    
    # Display folder structure
    print("Directory structure:")
    print_directory_structure()

def print_directory_structure(root_dir='.', indent=0, prefix=''):
    """
    Print a simplified directory structure, excluding node_modules details
    """
    # Get items in the directory
    try:
        items = sorted(os.listdir(root_dir))
    except PermissionError:
        return

    # Filter out unwanted items and organize the rest
    dirs = []
    files = []
    
    for item in items:
        # Skip hidden files/folders and node_modules details
        if item.startswith('.'):
            continue
        
        path = os.path.join(root_dir, item)
        
        if os.path.isdir(path):
            if item == 'node_modules':
                # Just show node_modules as a folder without its contents
                files.append(item)
            else:
                dirs.append(item)
        else:
            # Only include important files
            if is_important_file(item):
                files.append(item)
    
    # Print dirs first, then files
    for i, item in enumerate(dirs):
        is_last = (i == len(dirs) - 1) and not files
        new_prefix = "└── " if is_last else "├── "
        print(f"{prefix}{new_prefix}{item}")
        
        if root_dir == '.' and item == 'node_modules':
            # Don't go into node_modules
            continue
            
        next_prefix = "    " if is_last else "│   "
        print_directory_structure(
            os.path.join(root_dir, item), 
            indent + 4, 
            prefix + next_prefix
        )
    
    for i, item in enumerate(files):
        is_last = i == len(files) - 1
        new_prefix = "└── " if is_last else "├── "
        print(f"{prefix}{new_prefix}{item}")

def is_important_file(filename):
    """
    Check if a file is considered important enough to display
    """
    important_extensions = [
        '.json', '.js', '.ts', '.html', '.css', '.md', '.astro', 
        '.jsx', '.tsx', '.mjs', '.cjs', '.yml', '.yaml', '.toml'
    ]
    important_filenames = [
        'README', 'LICENSE', 'Dockerfile', '.gitignore', '.env.example', 
        'package.json', 'tsconfig.json', 'tailwind.config.js'
    ]
    
    # Check if it's a known important file by name
    for name in important_filenames:
        if filename.startswith(name):
            return True
    
    # Check by extension
    _, ext = os.path.splitext(filename)
    return ext in important_extensions

if __name__ == "__main__":
    draw_tree()

